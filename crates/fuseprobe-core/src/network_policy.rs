use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, ToSocketAddrs};

use url::{Host, Url};

const UNSAFE_TARGET_MESSAGE: &str =
    "Local and private targets are blocked by default. Enable Unsafe mode / Local targets to allow them.";

pub fn validate_target_policy(parsed: &Url, allow_unsafe_targets: bool) -> Result<(), String> {
    if allow_unsafe_targets {
        return Ok(());
    }

    let Some(host) = parsed.host() else {
        return Err("URL must include a host".to_string());
    };

    match host {
        Host::Domain(domain) => {
            if is_reserved_unsafe_domain(domain)
                || resolved_domain_contains_unsafe_ip(
                    domain,
                    parsed.port_or_known_default(),
                )
            {
                return Err(UNSAFE_TARGET_MESSAGE.to_string());
            }
        }
        Host::Ipv4(address) => {
            if is_unsafe_ipv4(address) {
                return Err(UNSAFE_TARGET_MESSAGE.to_string());
            }
        }
        Host::Ipv6(address) => {
            if is_unsafe_ipv6(address) {
                return Err(UNSAFE_TARGET_MESSAGE.to_string());
            }
        }
    }

    Ok(())
}

fn is_reserved_unsafe_domain(domain: &str) -> bool {
    let normalized = domain.trim_end_matches('.').to_ascii_lowercase();
    normalized == "localhost"
        || normalized.ends_with(".localhost")
        || normalized == "metadata.google.internal"
}

fn resolved_domain_contains_unsafe_ip(domain: &str, port: Option<u16>) -> bool {
    let Some(port) = port else {
        return false;
    };

    (domain, port)
        .to_socket_addrs()
        .map(|addrs| contains_unsafe_ip(addrs.map(|addr| addr.ip())))
        .unwrap_or(false)
}

fn contains_unsafe_ip(addresses: impl IntoIterator<Item = IpAddr>) -> bool {
    addresses.into_iter().any(|address| match address {
        IpAddr::V4(address) => is_unsafe_ipv4(address),
        IpAddr::V6(address) => is_unsafe_ipv6(address),
    })
}

fn is_unsafe_ipv4(address: Ipv4Addr) -> bool {
    address.is_loopback()
        || address.is_private()
        || address.is_link_local()
        || address.is_broadcast()
        || address.is_unspecified()
        || address.octets() == [169, 254, 169, 254]
}

fn is_unsafe_ipv6(address: Ipv6Addr) -> bool {
    address.is_loopback()
        || address.is_unique_local()
        || address.is_unicast_link_local()
        || address.is_unspecified()
}

#[cfg(test)]
mod tests {
    use super::{contains_unsafe_ip, is_reserved_unsafe_domain};
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

    #[test]
    fn flags_localhost_style_domains_as_unsafe() {
        assert!(is_reserved_unsafe_domain("localhost"));
        assert!(is_reserved_unsafe_domain("api.localhost"));
        assert!(is_reserved_unsafe_domain("metadata.google.internal"));
        assert!(!is_reserved_unsafe_domain("api.example.com"));
    }

    #[test]
    fn flags_private_and_loopback_ip_sets_as_unsafe() {
        assert!(contains_unsafe_ip([
            IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
            IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8)),
        ]));
        assert!(contains_unsafe_ip([IpAddr::V6(Ipv6Addr::LOCALHOST)]));
        assert!(!contains_unsafe_ip([IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))]));
    }
}
