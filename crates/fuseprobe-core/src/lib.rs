mod history;
mod redaction;
mod validation;

pub use history::{HistoryEntry, HistoryStore};
pub use redaction::redact_url;
pub use validation::validate_url;

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
