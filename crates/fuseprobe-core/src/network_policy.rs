use std::net::{Ipv4Addr, Ipv6Addr};

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
            if domain.eq_ignore_ascii_case("localhost")
                || domain.eq_ignore_ascii_case("metadata.google.internal")
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
