use url::Url;

use crate::network_policy::validate_target_policy;

pub fn validate_url(input: &str) -> Result<(), String> {
    validate_url_with_unsafe_targets(input, false)
}

pub fn validate_url_with_unsafe_targets(
    input: &str,
    allow_unsafe_targets: bool,
) -> Result<(), String> {
    let parsed = validate_url_structure(input)?;
    validate_target_policy(&parsed, allow_unsafe_targets)?;
    Ok(())
}

/// Structural validation only (no target policy): parse, scheme, whitespace,
/// host labels, and credentials. Callers must still run the target policy via
/// `validate_target_policy` or `validate_and_resolve_target` before trusting
/// the URL.
pub(crate) fn validate_url_structure(input: &str) -> Result<Url, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("URL cannot be empty".into());
    }

    if trimmed.chars().any(char::is_whitespace) {
        return Err("URL cannot contain whitespace".into());
    }

    let parsed = Url::parse(trimmed).map_err(|_| "URL is not valid".to_string())?;
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err("URL must start with http:// or https://".into()),
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| "URL must include a host".to_string())?;

    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("URL credentials are not allowed".into());
    }

    if let url::Host::Domain(_) = parsed
        .host()
        .ok_or_else(|| "URL must include a host".to_string())?
    {
        for label in host.split('.') {
            if label.is_empty() {
                return Err("URL host labels cannot be empty".into());
            }

            if label.len() > 63 {
                return Err("URL host labels cannot exceed 63 characters".into());
            }

            if label.starts_with('-') || label.ends_with('-') {
                return Err("URL host labels cannot start or end with '-'".into());
            }

            if !label
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || ch == '-')
            {
                return Err("URL host contains unsupported characters".into());
            }
        }
    }

    Ok(parsed)
}
