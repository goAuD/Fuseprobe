use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, ToSocketAddrs};

use url::{Host, Url};

const UNSAFE_TARGET_MESSAGE: &str =
    "Local and private targets are blocked by default. Enable Unsafe mode / Local targets to allow them.";
const DNS_RESOLUTION_FAILURE_MESSAGE: &str =
    "Connection failed: unable to resolve the target host during security validation.";

/// Resolves hostnames to the addresses the operating system would connect to.
///
/// The abstraction lets the request pipeline inject deterministic resolvers
/// (tests, validated-address caching) without touching real DNS.
pub trait HostResolver: Send + Sync {
    fn resolve(&self, host: &str, port: u16) -> Result<Vec<IpAddr>, String>;
}

/// Default resolver backed by the platform `getaddrinfo`.
pub struct SystemHostResolver;

impl HostResolver for SystemHostResolver {
    fn resolve(&self, host: &str, port: u16) -> Result<Vec<IpAddr>, String> {
        (host, port)
            .to_socket_addrs()
            .map(|addrs| addrs.map(|addr: SocketAddr| addr.ip()).collect())
            .map_err(|_| DNS_RESOLUTION_FAILURE_MESSAGE.to_string())
    }
}

pub fn validate_target_policy(parsed: &Url, allow_unsafe_targets: bool) -> Result<(), String> {
    validate_and_resolve_target(parsed, allow_unsafe_targets, &SystemHostResolver).map(|_| ())
}

/// Validates the URL against the target policy and, for domain hosts, returns
/// the addresses the policy accepted so the caller can connect to exactly what
/// was validated (the DNS-rebinding pinning primitive).
pub fn validate_and_resolve_target(
    parsed: &Url,
    allow_unsafe_targets: bool,
    resolver: &dyn HostResolver,
) -> Result<Vec<IpAddr>, String> {
    if allow_unsafe_targets {
        return Ok(Vec::new());
    }

    let Some(host) = parsed.host() else {
        return Err("URL must include a host".to_string());
    };

    match host {
        Host::Domain(domain) => {
            if is_reserved_unsafe_domain(domain) {
                return Err(UNSAFE_TARGET_MESSAGE.to_string());
            }

            let port = parsed
                .port_or_known_default()
                .ok_or_else(|| DNS_RESOLUTION_FAILURE_MESSAGE.to_string())?;

            let addresses = resolver.resolve(domain, port)?;
            if addresses.is_empty() {
                return Err(DNS_RESOLUTION_FAILURE_MESSAGE.to_string());
            }

            if addresses.iter().any(|address| is_unsafe_ip(*address)) {
                return Err(UNSAFE_TARGET_MESSAGE.to_string());
            }

            Ok(addresses)
        }
        Host::Ipv4(address) => {
            if is_unsafe_ipv4(address) {
                return Err(UNSAFE_TARGET_MESSAGE.to_string());
            }
            Ok(vec![IpAddr::V4(address)])
        }
        Host::Ipv6(address) => {
            if is_unsafe_ipv6(address) {
                return Err(UNSAFE_TARGET_MESSAGE.to_string());
            }
            Ok(vec![IpAddr::V6(address)])
        }
    }
}

fn is_reserved_unsafe_domain(domain: &str) -> bool {
    let normalized = domain.trim_end_matches('.').to_ascii_lowercase();
    normalized == "localhost"
        || normalized.ends_with(".localhost")
        || normalized == "metadata.google.internal"
        || normalized == "metadata.goog"
}

fn is_unsafe_ip(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(address) => is_unsafe_ipv4(address),
        IpAddr::V6(address) => is_unsafe_ipv6(address),
    }
}

/// IPv4 ranges that must never be contacted by validated requests.
///
/// Added deliberately (audit finding F2), not reflexively:
/// - loopback/private/link-local/broadcast/unspecified: stdlib classifiers.
/// - `0.0.0.0/8` ("this network"): hosts in this range have no legitimate
///   public meaning; `0.0.0.0` also aliases the local host on many stacks.
/// - `100.64.0.0/10` (shared address space / CGNAT, e.g. carrier networks and
///   Tailscale): sits between RFC1918 and public ranges and must not leak.
/// - `169.254.169.254` is covered by `is_link_local`, kept explicit because it
///   is the canonical cloud-metadata target.
///
/// Considered and intentionally NOT blocked (documented in the audit report):
/// `192.0.0.0/24`, `198.18.0.0/15`, `224.0.0.0/4`, `240.0.0.0/4` — TCP
/// connections there have no realistic SSRF payoff (no unicast services,
/// unreachable, or reserved for protocol assignment), and the ranges are not
/// user-reachable infrastructure that could exfiltrate or rebound data.
fn is_unsafe_ipv4(address: Ipv4Addr) -> bool {
    let octets = address.octets();
    address.is_loopback()
        || address.is_private()
        || address.is_link_local()
        || address.is_broadcast()
        || address.is_unspecified()
        || octets[0] == 0
        || (octets[0] == 100 && (64..=127).contains(&octets[1]))
        || octets == [169, 254, 169, 254]
}

fn is_unsafe_ipv6(address: Ipv6Addr) -> bool {
    if address.is_loopback()
        || address.is_unique_local()
        || address.is_unicast_link_local()
        || address.is_unspecified()
    {
        return true;
    }

    // F1: IPv4-mapped (::ffff:a.b.c.d) and deprecated IPv4-compatible
    // (::a.b.c.d) literals embed an IPv4 destination that the OS routes over
    // IPv4, so the embedded address must be classified by the IPv4 policy —
    // otherwise `::ffff:127.0.0.1` bypasses the loopback check entirely.
    if let Some(embedded) = address.to_ipv4() {
        return is_unsafe_ipv4(embedded);
    }

    false
}

#[cfg(test)]
mod tests {
    use super::{
        is_reserved_unsafe_domain, is_unsafe_ip, validate_and_resolve_target,
        validate_target_policy, HostResolver, DNS_RESOLUTION_FAILURE_MESSAGE,
        UNSAFE_TARGET_MESSAGE,
    };
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
    use std::sync::Mutex;
    use url::Url;

    struct MockHostResolver {
        responses: Mutex<Vec<Result<Vec<IpAddr>, String>>>,
    }

    impl MockHostResolver {
        fn with(responses: Vec<Result<Vec<IpAddr>, String>>) -> Self {
            Self {
                responses: Mutex::new(responses),
            }
        }
    }

    impl HostResolver for MockHostResolver {
        fn resolve(&self, _host: &str, _port: u16) -> Result<Vec<IpAddr>, String> {
            self.responses
                .lock()
                .expect("mock responses should lock")
                .remove(0)
        }
    }

    fn assert_policy_rejects(target: &str) {
        let parsed = Url::parse(target).expect("test target should parse");
        let error = validate_target_policy(&parsed, false)
            .expect_err("target should be rejected by the policy");
        assert_eq!(error, UNSAFE_TARGET_MESSAGE);
    }

    fn assert_policy_allows(target: &str) {
        let parsed = Url::parse(target).expect("test target should parse");
        validate_target_policy(&parsed, false)
            .expect("target should be accepted by the policy");
    }

    #[test]
    fn flags_localhost_style_domains_as_unsafe() {
        assert!(is_reserved_unsafe_domain("localhost"));
        assert!(is_reserved_unsafe_domain("api.localhost"));
        assert!(is_reserved_unsafe_domain("metadata.google.internal"));
        assert!(!is_reserved_unsafe_domain("api.example.com"));
    }

    #[test]
    fn flags_private_and_loopback_ip_sets_as_unsafe() {
        assert!(is_unsafe_ip(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))));
        assert!(is_unsafe_ip(IpAddr::V6(Ipv6Addr::LOCALHOST)));
        assert!(!is_unsafe_ip(IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))));
    }

    #[test]
    fn treats_unresolvable_domains_as_resolution_failures() {
        let parsed = Url::parse("http://fuseprobe-resolution-test.invalid/")
            .expect("test target should parse");
        let error = validate_target_policy(&parsed, false)
            .expect_err("unresolvable domains must fail closed");

        assert_eq!(error, DNS_RESOLUTION_FAILURE_MESSAGE);
    }

    #[test]
    fn records_resolved_addresses_for_pinning() {
        let parsed =
            Url::parse("http://fuseprobe-pinned.test/").expect("test target should parse");
        let addresses = validate_and_resolve_target(
            &parsed,
            false,
            &MockHostResolver::with(vec![Ok(vec![IpAddr::V4(Ipv4Addr::new(203, 0, 113, 10))])]),
        )
        .expect("public resolution should validate");

        assert_eq!(addresses, vec![IpAddr::V4(Ipv4Addr::new(203, 0, 113, 10))]);
    }

    #[test]
    fn rejects_domains_that_resolve_to_any_unsafe_address() {
        let parsed =
            Url::parse("http://fuseprobe-rebinding.test/").expect("test target should parse");
        let error = validate_and_resolve_target(
            &parsed,
            false,
            &MockHostResolver::with(vec![Ok(vec![
                IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8)),
                IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
            ])]),
        )
        .expect_err("unsafe resolved addresses must be rejected");

        assert_eq!(error, UNSAFE_TARGET_MESSAGE);
    }

    #[test]
    fn surfaces_resolver_failures_as_dns_errors() {
        let parsed =
            Url::parse("http://fuseprobe-failing.test/").expect("test target should parse");
        let error = validate_and_resolve_target(
            &parsed,
            false,
            &MockHostResolver::with(vec![Err(DNS_RESOLUTION_FAILURE_MESSAGE.to_string())]),
        )
        .expect_err("resolution failures must surface");

        assert_eq!(error, DNS_RESOLUTION_FAILURE_MESSAGE);
    }

    #[test]
    fn returns_ip_literals_as_the_validated_addresses() {
        let parsed = Url::parse("http://203.0.113.10/").expect("test target should parse");
        assert_eq!(
            validate_and_resolve_target(&parsed, false, &MockHostResolver::with(Vec::new()))
                .expect("public IPv4 literal should validate"),
            vec![IpAddr::V4(Ipv4Addr::new(203, 0, 113, 10))]
        );

        let parsed = Url::parse("http://[2001:db8::1]/").expect("test target should parse");
        assert_eq!(
            validate_and_resolve_target(&parsed, false, &MockHostResolver::with(Vec::new()))
                .expect("global IPv6 literal should validate"),
            vec![IpAddr::V6(Ipv6Addr::new(0x2001, 0xdb8, 0, 0, 0, 0, 0, 1))]
        );
    }

    // F1 regression: IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible
    // (::a.b.c.d) IPv6 literals embed an IPv4 destination the OS routes over
    // IPv4, so the embedded address must be classified by the IPv4 policy.
    #[test]
    fn blocks_ipv4_mapped_and_compatible_ipv6_targets() {
        assert_policy_rejects("http://[::ffff:127.0.0.1]/");
        assert_policy_rejects("http://[::ffff:169.254.169.254]/");
        assert_policy_rejects("http://[::ffff:10.0.0.5]/");
        assert_policy_rejects("http://[::ffff:192.168.1.10]/");
        assert_policy_rejects("http://[::127.0.0.1]/");
        assert_policy_rejects("http://[::0.0.0.0]/");
    }

    // Control: genuine public/global IPv6 destinations stay allowed.
    #[test]
    fn still_allows_global_ipv6_targets() {
        assert_policy_allows("http://[2001:db8::1]/");
        assert_policy_allows("http://[2606:4700:4700::1111]/");
    }

    // F2 regression: the shared address space (CGNAT, 100.64.0.0/10) sits
    // between private and public ranges and must be classified as unsafe.
    #[test]
    fn blocks_the_shared_address_space_cgnat_range() {
        assert_policy_rejects("http://100.64.0.1/");
        assert_policy_rejects("http://100.100.100.100/");
        assert_policy_rejects("http://100.127.255.254/");
    }

    // Control: addresses just outside 100.64.0.0/10 remain reachable.
    #[test]
    fn still_allows_addresses_outside_the_cgnat_range() {
        assert_policy_allows("http://100.63.255.254/");
        assert_policy_allows("http://100.128.0.1/");
        assert_policy_allows("http://203.0.113.10/");
    }
}
