mod formatting;
mod history;
mod redaction;
mod request;
mod validation;

pub use formatting::{classify_response, BodyKind, FormatResult};
pub use history::{HistoryEntry, HistoryStore};
pub use redaction::redact_url;
pub use request::{RequestOptions, DEFAULT_MAX_RESPONSE_BYTES};
pub use validation::validate_url;

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
