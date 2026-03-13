mod formatting;
mod history;
mod redaction;
mod request;
mod settings;
mod validation;

pub use formatting::{
    classify_response, extract_charset, format_response_body, BodyKind, FormatResult,
    FormattedResponse,
};
pub use history::{HistoryEntry, HistoryStore};
pub use redaction::redact_url;
pub use request::{execute_request, ExecutedResponse, RequestOptions, DEFAULT_MAX_RESPONSE_BYTES};
pub use settings::SecuritySettings;
pub use validation::validate_url;

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
