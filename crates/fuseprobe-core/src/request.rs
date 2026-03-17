use std::{
    collections::BTreeMap,
    io::Read,
    time::{Duration, Instant},
};

use reqwest::{
    blocking::{Client, Response},
    header::{HeaderMap, HeaderName, HeaderValue},
    redirect::Policy,
    Method,
};
use serde_json::Value;
use url::Url;

use crate::{format_response_body, redact_url, validate_url_with_unsafe_targets};

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
    validate_url_with_unsafe_targets(url, options.allow_unsafe_targets)?;
    validate_input_sizes(payload, headers_text, options)?;

    let method = parse_method(method)?;
    let json_payload = parse_json_payload(payload)?;
    let headers = parse_headers(headers_text)?;
    let client = build_client(options)?;
    let started_at = Instant::now();

    let mut request = client.request(method, url).headers(headers);
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

fn build_client(options: &RequestOptions) -> Result<Client, String> {
    let redirect_policy = if options.follow_redirects {
        Policy::limited(10)
    } else {
        Policy::none()
    };

    Client::builder()
        .timeout(Duration::from_secs(options.timeout_seconds))
        .redirect(redirect_policy)
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
    use super::format_connection_failure;

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
}
