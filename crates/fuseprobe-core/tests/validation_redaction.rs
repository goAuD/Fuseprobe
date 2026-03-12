use fuseprobe_core::{redact_url, validate_url};

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
fn leaves_plain_urls_unchanged() {
    let url = "https://api.example.com/items/1";
    assert_eq!(redact_url(url), url);
}
