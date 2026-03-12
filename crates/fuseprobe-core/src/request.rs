pub const DEFAULT_MAX_RESPONSE_BYTES: usize = 1024 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RequestOptions {
    pub follow_redirects: bool,
    pub max_response_bytes: usize,
    pub timeout_seconds: u64,
}

impl Default for RequestOptions {
    fn default() -> Self {
        Self {
            follow_redirects: false,
            max_response_bytes: DEFAULT_MAX_RESPONSE_BYTES,
            timeout_seconds: 10,
        }
    }
}
