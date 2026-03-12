use fuseprobe_core::{RequestOptions, DEFAULT_MAX_RESPONSE_BYTES};

#[test]
fn defaults_to_no_redirect_following() {
    let options = RequestOptions::default();
    assert!(!options.follow_redirects);
}

#[test]
fn enforces_a_max_response_size() {
    let options = RequestOptions::default();
    assert_eq!(options.max_response_bytes, DEFAULT_MAX_RESPONSE_BYTES);
}

#[test]
fn keeps_a_timeout_default() {
    let options = RequestOptions::default();
    assert_eq!(options.timeout_seconds, 10);
}
