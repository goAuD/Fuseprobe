use fuseprobe_core::{
    redact_url, redact_url_for_history, validate_url, validate_url_with_unsafe_targets,
};

#[test]
fn rejects_urls_with_embedded_credentials() {
    let err = validate_url("https://user:secret@example.com").unwrap_err();
    assert!(err.contains("credentials"));
}

#[test]
fn accepts_valid_intranet_style_urls() {
    assert!(validate_url("http://intranet/api").is_ok());
    assert!(validate_url("https://internal-api:3000").is_ok());
}

#[test]
fn rejects_loopback_and_metadata_targets_by_default() {
    let loopback = validate_url("http://127.0.0.1:8000").unwrap_err();
    let localhost = validate_url("http://localhost:3000").unwrap_err();
    let localhost_alias = validate_url("http://api.localhost:3000").unwrap_err();
    let metadata = validate_url("http://169.254.169.254/latest/meta-data/").unwrap_err();

    assert!(loopback.contains("Unsafe mode"));
    assert!(localhost.contains("Unsafe mode"));
    assert!(localhost_alias.contains("Unsafe mode"));
    assert!(metadata.contains("Unsafe mode"));
}

#[test]
fn allows_loopback_targets_when_unsafe_mode_is_enabled() {
    assert!(validate_url_with_unsafe_targets("http://127.0.0.1:8000", true).is_ok());
    assert!(validate_url_with_unsafe_targets("http://localhost:3000", true).is_ok());
}

#[test]
fn rejects_invalid_schemes_and_whitespace() {
    assert!(validate_url("ftp://example.com/file").is_err());
    assert!(validate_url("https://bad host.example.com").is_err());
}

#[test]
fn redacts_sensitive_query_values() {
    let redacted = redact_url("https://api.example.com?token=abc123&safe=yes&api_key=secret");

    assert!(redacted.contains("token=%2A%2A%2A"));
    assert!(redacted.contains("api_key=%2A%2A%2A"));
    assert!(redacted.contains("safe=yes"));
}

#[test]
fn redacts_all_query_values_and_fragments_for_history() {
    let redacted =
        redact_url_for_history("https://api.example.com/items?page=2&token=secret#section");

    assert!(redacted.contains("page=%2A%2A%2A"));
    assert!(redacted.contains("token=%2A%2A%2A"));
    assert!(!redacted.contains("page=2"));
    assert!(!redacted.contains("#section"));
}

#[test]
fn leaves_plain_urls_unchanged() {
    let url = "https://api.example.com/items/1";
    assert_eq!(redact_url(url), url);
}
