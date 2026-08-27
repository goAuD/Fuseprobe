use std::{
    collections::{BTreeMap, HashMap},
    io::Read,
    net::{IpAddr, SocketAddr},
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use reqwest::{
    blocking::{Client, Response},
    dns::{Addrs, Name, Resolve, Resolving},
    header::{HeaderMap, HeaderName, HeaderValue},
    redirect::Policy,
    Method,
};
use serde_json::Value;
use url::Url;

use crate::{
    format_response_body,
    network_policy::{validate_and_resolve_target, HostResolver, SystemHostResolver},
    redact_url,
    validation::validate_url_structure,
};

const MAX_REDIRECT_HOPS: usize = 10;

pub const DEFAULT_MAX_RESPONSE_BYTES: usize = 1024 * 1024;
pub const DEFAULT_MAX_REQUEST_BODY_BYTES: usize = 256 * 1024;
pub const DEFAULT_MAX_REQUEST_HEADERS_BYTES: usize = 32 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestOptions {
    pub follow_redirects: bool,
    pub max_response_bytes: usize,
    pub max_request_body_bytes: usize,
    pub max_request_headers_bytes: usize,
    pub timeout_seconds: u64,
    pub allow_unsafe_targets: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExecutedResponse {
    pub status_code: u16,
    pub reason: String,
    pub elapsed_ms: f64,
    pub headers: BTreeMap<String, String>,
    pub body: String,
    pub raw_body: String,
    pub is_json: bool,
    pub is_binary: bool,
    pub truncated: bool,
    pub content_type: String,
    pub byte_count: usize,
    pub charset: String,
    pub redirect_location: Option<String>,
}

impl Default for RequestOptions {
    fn default() -> Self {
        Self {
            follow_redirects: false,
            max_response_bytes: DEFAULT_MAX_RESPONSE_BYTES,
            max_request_body_bytes: DEFAULT_MAX_REQUEST_BODY_BYTES,
            max_request_headers_bytes: DEFAULT_MAX_REQUEST_HEADERS_BYTES,
            timeout_seconds: 10,
            allow_unsafe_targets: false,
        }
    }
}

pub fn execute_request(
    method: &str,
    url: &str,
    payload: &str,
    headers_text: &str,
    options: &RequestOptions,
) -> Result<ExecutedResponse, String> {
    execute_request_with_resolver(
        method,
        url,
        payload,
        headers_text,
        options,
        Arc::new(SystemHostResolver),
    )
}

/// Executes the request with an injectable hostname resolver.
///
/// The first resolution happens inside target validation and its result is
/// stored in a per-request cache; the HTTP client resolves names through that
/// cache, so the connection (and any redirect hop to the same host) reuses the
/// exact address the policy validated instead of re-resolving the hostname.
/// This closes the validate/re-resolve DNS-rebinding window (audit finding A1).
pub fn execute_request_with_resolver(
    method: &str,
    url: &str,
    payload: &str,
    headers_text: &str,
    options: &RequestOptions,
    resolver: Arc<dyn HostResolver>,
) -> Result<ExecutedResponse, String> {
    let parsed_url = validate_url_structure(url)?;
    validate_input_sizes(payload, headers_text, options)?;

    let method = parse_method(method)?;
    let json_payload = parse_json_payload(payload)?;
    let headers = parse_headers(headers_text)?;

    let cache = Arc::new(ResolvedTargetCache::new());
    let validating_resolver = CachedHostResolver::new(Arc::clone(&cache), Arc::clone(&resolver));
    validate_and_resolve_target(
        &parsed_url,
        options.allow_unsafe_targets,
        &validating_resolver,
    )?;

    let client = build_client(options, &cache, &resolver)?;
    let started_at = Instant::now();

    let mut request = client.request(method, parsed_url.clone()).headers(headers);
    if let Some(json_payload) = json_payload.as_ref() {
        request = request.json(json_payload);
    }

    let mut response = request
        .send()
        .map_err(|error| map_request_error(error, url, options.timeout_seconds))?;

    let status = response.status();
    let reason = status.canonical_reason().unwrap_or_default().to_string();
    let headers = collect_headers(&response);
    let content_type = headers.get("content-type").cloned().unwrap_or_default();
    let (raw_body, truncated) = read_response_body(&mut response, options.max_response_bytes)?;
    let formatted = format_response_body(&content_type, &raw_body, truncated);
    let redirect_location = if !options.follow_redirects && status.is_redirection() {
        headers.get("location").cloned().map(|location| redact_url(&location))
    } else {
        None
    };

    Ok(ExecutedResponse {
        status_code: status.as_u16(),
        reason,
        elapsed_ms: started_at.elapsed().as_secs_f64() * 1000.0,
        headers,
        body: formatted.body,
        raw_body: formatted.raw_text,
        is_json: formatted.is_json,
        is_binary: formatted.is_binary,
        truncated: formatted.truncated,
        content_type: formatted.content_type,
        byte_count: formatted.byte_count,
        charset: formatted.charset,
        redirect_location,
    })
}

fn validate_input_sizes(
    payload: &str,
    headers_text: &str,
    options: &RequestOptions,
) -> Result<(), String> {
    let payload_len = payload.len();
    if payload_len > options.max_request_body_bytes {
        return Err(format!(
            "Request body exceeds the {} byte limit",
            options.max_request_body_bytes
        ));
    }

    let headers_len = headers_text.len();
    if headers_len > options.max_request_headers_bytes {
        return Err(format!(
            "Request headers exceed the {} byte limit",
            options.max_request_headers_bytes
        ));
    }

    Ok(())
}

/// Addresses the target policy already validated for a hostname.
///
const UNVALIDATED_HOST_MESSAGE: &str =
    "Connection blocked: the host was not approved by the target policy.";

/// The HTTP client resolves names through this cache, so every connection it
/// opens goes to the exact address that was validated (DNS-rebinding pinning).
#[derive(Default)]
struct ResolvedTargetCache {
    entries: Mutex<HashMap<String, Vec<IpAddr>>>,
}

impl ResolvedTargetCache {
    fn new() -> Self {
        Self::default()
    }

    fn key(host: &str) -> String {
        host.trim_end_matches('.').to_ascii_lowercase()
    }

    fn get(&self, host: &str) -> Option<Vec<IpAddr>> {
        let entries = self.entries.lock().ok()?;
        entries.get(&Self::key(host)).cloned()
    }

    fn store(&self, host: &str, addresses: Vec<IpAddr>) {
        if let Ok(mut entries) = self.entries.lock() {
            entries.insert(Self::key(host), addresses);
        }
    }
}

/// `HostResolver` that consults (and populates) the validated-address cache.
struct CachedHostResolver {
    cache: Arc<ResolvedTargetCache>,
    fallback: Arc<dyn HostResolver>,
}

impl CachedHostResolver {
    fn new(cache: Arc<ResolvedTargetCache>, fallback: Arc<dyn HostResolver>) -> Self {
        Self { cache, fallback }
    }
}

impl HostResolver for CachedHostResolver {
    fn resolve(&self, host: &str, port: u16) -> Result<Vec<IpAddr>, String> {
        if let Some(addresses) = self.cache.get(host) {
            return Ok(addresses);
        }

        let addresses = self.fallback.resolve(host, port)?;
        self.cache.store(host, addresses.clone());
        Ok(addresses)
    }
}

/// reqwest DNS resolver backed by the validated-address cache.
///
/// Resolved addresses use port 0; reqwest replaces it with the URL port (or the
/// scheme default).
///
/// A cache miss means this resolver was asked for a host the target policy never
/// approved. While the policy is active that should be unreachable, since
/// `execute_request` validates and caches before the client is built and the
/// redirect policy does the same for every hop. Rather than rest on that
/// argument, a miss under an active policy fails closed. Unsafe mode has no
/// policy to satisfy, so it resolves normally.
struct ValidatedDnsResolver {
    cache: Arc<ResolvedTargetCache>,
    fallback: Arc<dyn HostResolver>,
    allow_unsafe_targets: bool,
}

impl ValidatedDnsResolver {
    /// What to do when the cache holds no entry for `host`.
    ///
    /// Kept separate from the async `resolve` so the decision is directly
    /// testable without an executor.
    fn resolve_uncached(&self, host: &str) -> Result<Vec<IpAddr>, String> {
        if !self.allow_unsafe_targets {
            return Err(UNVALIDATED_HOST_MESSAGE.to_string());
        }

        let addresses = self.fallback.resolve(host, 0)?;
        self.cache.store(host, addresses.clone());
        Ok(addresses)
    }
}

impl Resolve for ValidatedDnsResolver {
    fn resolve(&self, name: Name) -> Resolving {
        let resolver = ValidatedDnsResolver {
            cache: Arc::clone(&self.cache),
            fallback: Arc::clone(&self.fallback),
            allow_unsafe_targets: self.allow_unsafe_targets,
        };
        let host = name.as_str().to_string();

        Box::pin(async move {
            if let Some(addresses) = resolver.cache.get(&host) {
                return Ok(to_addrs(addresses));
            }

            resolver
                .resolve_uncached(&host)
                .map(to_addrs)
                .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })
        })
    }
}

fn to_addrs(addresses: Vec<IpAddr>) -> Addrs {
    Box::new(
        addresses
            .into_iter()
            .map(|address| SocketAddr::new(address, 0)),
    )
}

fn build_client(
    options: &RequestOptions,
    cache: &Arc<ResolvedTargetCache>,
    resolver: &Arc<dyn HostResolver>,
) -> Result<Client, String> {
    let redirect_policy = if options.follow_redirects {
        let allow_unsafe_targets = options.allow_unsafe_targets;
        let redirect_cache = Arc::clone(cache);
        let redirect_resolver = Arc::clone(resolver);

        // Each redirect hop is revalidated against the same target policy as
        // the original request (audit finding A2); validated resolutions are
        // cached so the hop connects to what was just validated.
        Policy::custom(move |attempt| {
            // `previous()` includes the original URL, so `> MAX` allows the
            // same 10 redirects as the previous `Policy::limited(10)`.
            if attempt.previous().len() > MAX_REDIRECT_HOPS {
                return attempt.error(format!("Redirect limit of {MAX_REDIRECT_HOPS} exceeded"));
            }

            let hop_resolver =
                CachedHostResolver::new(Arc::clone(&redirect_cache), Arc::clone(&redirect_resolver));
            match validate_and_resolve_target(attempt.url(), allow_unsafe_targets, &hop_resolver) {
                Ok(_) => attempt.follow(),
                Err(error) => attempt.error(format!("Redirect blocked by target policy: {error}")),
            }
        })
    } else {
        Policy::none()
    };

    Client::builder()
        .timeout(Duration::from_secs(options.timeout_seconds))
        .redirect(redirect_policy)
        .dns_resolver(Arc::new(ValidatedDnsResolver {
            cache: Arc::clone(cache),
            fallback: Arc::clone(resolver),
            allow_unsafe_targets: options.allow_unsafe_targets,
        }))
        .build()
        .map_err(|error| format!("Failed to build HTTP client: {error}"))
}

fn parse_method(method: &str) -> Result<Method, String> {
    Method::from_bytes(method.trim().to_ascii_uppercase().as_bytes())
        .map_err(|_| "HTTP method is not valid".to_string())
}

fn parse_json_payload(payload: &str) -> Result<Option<Value>, String> {
    let trimmed = payload.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    serde_json::from_str(trimmed)
        .map(Some)
        .map_err(|error| format!("Invalid JSON in request body: {error}"))
}

fn parse_headers(headers_text: &str) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    if headers_text.trim().is_empty() {
        return Ok(headers);
    }

    for (index, raw_line) in headers_text.lines().enumerate() {
        let line_number = index + 1;
        let line = raw_line.trim();
        if line.is_empty() {
            continue;
        }

        let Some((raw_key, raw_value)) = line.split_once(':') else {
            return Err(format!(
                "Invalid header on line {line_number}: expected 'Name: Value'"
            ));
        };

        let key = raw_key.trim();
        let value = raw_value.trim();

        if key.is_empty() {
            return Err(format!(
                "Invalid header on line {line_number}: header name cannot be empty"
            ));
        }

        if value.contains('\r') || value.contains('\n') || value.contains('\0') {
            return Err(format!(
                "Invalid header on line {line_number}: header value contains control characters"
            ));
        }

        let header_name = HeaderName::from_bytes(key.as_bytes()).map_err(|_| {
            format!("Invalid header on line {line_number}: unsupported header name '{key}'")
        })?;
        let header_value = HeaderValue::from_str(value).map_err(|_| {
            format!(
                "Invalid header on line {line_number}: header value contains control characters"
            )
        })?;
        headers.insert(header_name, header_value);
    }

    Ok(headers)
}

fn read_response_body(
    response: &mut Response,
    max_response_bytes: usize,
) -> Result<(Vec<u8>, bool), String> {
    let mut body_buffer = Vec::new();
    let mut chunk = [0_u8; 8192];
    let mut truncated = false;

    loop {
        let read = response
            .read(&mut chunk)
            .map_err(|error| format!("Failed to read response body: {error}"))?;
        if read == 0 {
            break;
        }

        let remaining = max_response_bytes.saturating_sub(body_buffer.len());
        if remaining == 0 {
            truncated = true;
            break;
        }

        if read > remaining {
            body_buffer.extend_from_slice(&chunk[..remaining]);
            truncated = true;
            break;
        }

        body_buffer.extend_from_slice(&chunk[..read]);
    }

    Ok((body_buffer, truncated))
}

fn collect_headers(response: &Response) -> BTreeMap<String, String> {
    response
        .headers()
        .iter()
        .map(|(name, value)| {
            (
                name.as_str().to_ascii_lowercase(),
                value.to_str().unwrap_or_default().to_string(),
            )
        })
        .collect()
}

fn map_request_error(error: reqwest::Error, url: &str, timeout_seconds: u64) -> String {
    if error.is_timeout() {
        return format!("Request timed out after {timeout_seconds} seconds");
    }

    let sanitized = sanitize_error_message(&error.to_string(), url);
    if error.is_connect() {
        format_connection_failure(url, &sanitized)
    } else {
        format!("Request failed: {sanitized}")
    }
}

fn format_connection_failure(url: &str, detail: &str) -> String {
    let guidance = if is_local_target_url(url) {
        "Connection failed: the target was allowed, but no local service answered. Verify that the server is running and listening on the selected host and port."
    } else {
        "Connection failed: unable to reach the target. Verify that the host, port, and network path are correct."
    };

    format!("{guidance} Details: {detail}")
}

fn sanitize_error_message(message: &str, url: &str) -> String {
    let safe_url = redact_url(url);
    if safe_url == url {
        message.to_string()
    } else {
        message.replace(url, &safe_url)
    }
}

fn is_local_target_url(url: &str) -> bool {
    let Ok(parsed_url) = Url::parse(url) else {
        return false;
    };

    match parsed_url.host_str() {
        Some("localhost") => true,
        Some(host) => host.parse::<std::net::IpAddr>().map_or(false, |ip| ip.is_loopback()),
        None => false,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        format_connection_failure, CachedHostResolver, ResolvedTargetCache, ValidatedDnsResolver,
        UNVALIDATED_HOST_MESSAGE,
    };
    use crate::network_policy::HostResolver;
    use std::net::{IpAddr, Ipv4Addr};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    struct CountingResolver {
        addresses: Vec<IpAddr>,
        calls: AtomicUsize,
    }

    impl CountingResolver {
        fn new(addresses: Vec<IpAddr>) -> Self {
            Self {
                addresses,
                calls: AtomicUsize::new(0),
            }
        }
    }

    impl HostResolver for CountingResolver {
        fn resolve(&self, _host: &str, _port: u16) -> Result<Vec<IpAddr>, String> {
            self.calls.fetch_add(1, Ordering::SeqCst);
            Ok(self.addresses.clone())
        }
    }

    struct PanickingResolver;

    impl HostResolver for PanickingResolver {
        fn resolve(&self, _host: &str, _port: u16) -> Result<Vec<IpAddr>, String> {
            panic!("cached hosts must not trigger a new lookup");
        }
    }

    /// A cache miss means the target policy never approved this host. While the
    /// policy is active that should be unreachable, so it must fail rather than
    /// quietly resolve, which is what it did before.
    #[test]
    fn unvalidated_host_is_refused_while_the_policy_is_active() {
        let resolver = ValidatedDnsResolver {
            cache: Arc::new(ResolvedTargetCache::new()),
            fallback: Arc::new(CountingResolver::new(vec![IpAddr::V4(Ipv4Addr::new(
                127, 0, 0, 1,
            ))])),
            allow_unsafe_targets: false,
        };

        let error = resolver
            .resolve_uncached("attacker.test")
            .expect_err("an unvalidated host must not resolve");

        assert_eq!(error, UNVALIDATED_HOST_MESSAGE);
    }

    /// Unsafe mode has no policy to satisfy, so the same miss resolves normally.
    #[test]
    fn unvalidated_host_still_resolves_in_unsafe_mode() {
        let resolver = ValidatedDnsResolver {
            cache: Arc::new(ResolvedTargetCache::new()),
            fallback: Arc::new(CountingResolver::new(vec![IpAddr::V4(Ipv4Addr::new(
                127, 0, 0, 1,
            ))])),
            allow_unsafe_targets: true,
        };

        assert_eq!(
            resolver.resolve_uncached("local.test"),
            Ok(vec![IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))])
        );
    }

    #[test]
    fn local_connection_failure_message_is_explicit() {
        let message = format_connection_failure(
            "http://localhost:8080/api/health",
            "error sending request for url (http://localhost:8080/api/health)",
        );

        assert!(message.contains("the target was allowed"));
        assert!(message.contains("server is running and listening"));
    }

    #[test]
    fn remote_connection_failure_message_stays_generic() {
        let message = format_connection_failure(
            "https://api.example.com/users",
            "error sending request for url (https://api.example.com/users)",
        );

        assert!(message.contains("unable to reach the target"));
        assert!(!message.contains("target was allowed"));
    }

    #[test]
    fn validated_cache_pinning_skips_new_lookups_for_cached_hosts() {
        let cache = Arc::new(ResolvedTargetCache::new());
        cache.store(
            "Fuseprobe-Pinned.Test",
            vec![IpAddr::V4(Ipv4Addr::new(203, 0, 113, 7))],
        );

        let resolver = CachedHostResolver::new(Arc::clone(&cache), Arc::new(PanickingResolver));

        // Casing and a trailing dot must hit the same normalized cache entry.
        let addresses = resolver
            .resolve("FUSEPROBE-PINNED.test.", 443)
            .expect("cached addresses should resolve without a lookup");

        assert_eq!(addresses, vec![IpAddr::V4(Ipv4Addr::new(203, 0, 113, 7))]);
    }

    #[test]
    fn validated_cache_stores_the_first_lookup_for_reuse() {
        let cache = Arc::new(ResolvedTargetCache::new());
        let fallback = Arc::new(CountingResolver::new(vec![IpAddr::V4(Ipv4Addr::new(
            203, 0, 113, 9,
        ))]));
        let resolver = CachedHostResolver::new(
            Arc::clone(&cache),
            Arc::clone(&fallback) as Arc<dyn HostResolver>,
        );

        let first = resolver
            .resolve("fuseprobe-first.test", 80)
            .expect("first lookup should succeed");
        let second = resolver
            .resolve("fuseprobe-first.test", 80)
            .expect("second lookup should succeed");

        assert_eq!(first, second);
        assert_eq!(second, vec![IpAddr::V4(Ipv4Addr::new(203, 0, 113, 9))]);
        assert_eq!(
            fallback.calls.load(Ordering::SeqCst),
            1,
            "the second resolve must be served from the validated cache"
        );
    }
}
