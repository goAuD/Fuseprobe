mod formatting;
mod history;
mod network_policy;
mod redaction;
mod request;
mod settings;
mod validation;

pub use formatting::{
    classify_response, extract_charset, format_response_body, BodyKind, FormatResult,
    FormattedResponse,
};
pub use history::{HistoryEntry, HistoryStore};
pub use redaction::{redact_url, redact_url_for_history};
pub use request::{execute_request, ExecutedResponse, RequestOptions, DEFAULT_MAX_RESPONSE_BYTES};
pub use settings::SecuritySettings;
pub use validation::{validate_url, validate_url_with_unsafe_targets};

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
