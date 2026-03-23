use chrono::Local;

use fuseprobe_core::{execute_request, HistoryEntry, RequestOptions};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use crate::state::{sync_history_persistence, AppState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendRequestPayload {
    pub method: String,
    pub url: String,
    pub body: String,
    pub headers: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendRequestResult {
    pub request: SendRequestPayload,
    pub status_code: u16,
    pub reason: String,
    pub duration_ms: u64,
    pub byte_count: usize,
    pub content_type: String,
    pub charset: String,
    pub response_text: String,
    pub raw_response_text: String,
    pub response_headers: BTreeMap<String, String>,
    pub policy_code: String,
    pub is_binary: bool,
    pub truncated: bool,
    pub redirect_location: Option<String>,
    pub persistence_warning_code: Option<String>,
}

#[tauri::command]
pub async fn send_request(
    state: tauri::State<'_, AppState>,
    payload: SendRequestPayload,
) -> Result<SendRequestResult, String> {
    let _request_guard = state.try_begin_request()?;
    let payload_for_core = payload.clone();
    let settings = state
        .settings
        .lock()
        .map_err(|_| "settings_unavailable".to_string())?
        .clone();
    let allow_unsafe_targets = settings.allow_unsafe_targets;
    let persist_history = settings.persist_history;
    let options = RequestOptions {
        allow_unsafe_targets,
        ..RequestOptions::default()
    };

    let executed = tauri::async_runtime::spawn_blocking(move || {
        execute_request(
            &payload_for_core.method,
            &payload_for_core.url,
            &payload_for_core.body,
            &payload_for_core.headers,
            &options,
        )
    })
    .await
    .map_err(|_| "request_worker_failed".to_string())?
    .map_err(|error| map_request_error_code(&error))?;

    let history_entry = HistoryEntry {
        method: payload.method.to_ascii_uppercase(),
        url: payload.url.clone(),
        status: i64::from(executed.status_code),
        elapsed: executed.elapsed_ms,
        time: current_time_label(),
    };

    let mut history = state
        .history
        .lock()
        .map_err(|_| "history_unavailable".to_string())?;
    history.add(history_entry);
    let persistence_warning_code =
        sync_history_persistence(&history, state.history_file.as_deref(), persist_history);
    state.set_persistence_warning(persistence_warning_code.clone())?;

    Ok(SendRequestResult {
        request: payload,
        status_code: executed.status_code,
        reason: executed.reason,
        duration_ms: executed.elapsed_ms.round() as u64,
        byte_count: executed.byte_count,
        content_type: if executed.content_type.is_empty() {
            "unknown".to_string()
        } else {
            executed.content_type
        },
        charset: executed.charset,
        response_text: executed.body,
        raw_response_text: executed.raw_body,
        response_headers: executed.headers,
        policy_code: "redirects_disabled".to_string(),
        is_binary: executed.is_binary,
        truncated: executed.truncated,
        redirect_location: executed.redirect_location,
        persistence_warning_code,
    })
}

fn current_time_label() -> String {
    Local::now().format("%H:%M:%S").to_string()
}

fn map_request_error_code(error: &str) -> String {
    if error.contains("URL must start with http:// or https://")
        || error.contains("URL must include a host")
        || error.contains("URL credentials are not allowed")
    {
        return "request_invalid_url".to_string();
    }

    if error.contains("Unsafe mode / Local targets") {
        return "request_unsafe_target".to_string();
    }

    if error.starts_with("Invalid JSON in request body:") {
        return "request_invalid_body".to_string();
    }

    if error.starts_with("Request body exceeds the ") {
        return "request_body_too_large".to_string();
    }

    if error.starts_with("Invalid header on line ") {
        return "request_invalid_headers".to_string();
    }

    if error.starts_with("Request headers exceed the ") {
        return "request_headers_too_large".to_string();
    }

    if error.starts_with("Request timed out after ") {
        return "request_timeout".to_string();
    }

    if error.starts_with(
        "Connection failed: unable to resolve the target host during security validation.",
    ) {
        return "request_unresolvable_host".to_string();
    }

    if error.starts_with("Connection failed: the target was allowed") {
        return "request_connection_local_unavailable".to_string();
    }

    if error.starts_with("Connection failed: unable to reach the target.") {
        return "request_connection_failed".to_string();
    }

    "request_failed".to_string()
}

#[cfg(test)]
mod tests {
    use super::map_request_error_code;

    #[test]
    fn maps_security_validation_dns_failures_to_a_distinct_error_code() {
        assert_eq!(
            map_request_error_code(
                "Connection failed: unable to resolve the target host during security validation."
            ),
            "request_unresolvable_host"
        );
    }

    #[test]
    fn keeps_runtime_connection_failures_on_the_generic_connection_code() {
        assert_eq!(
            map_request_error_code("Connection failed: unable to reach the target. socket hang up"),
            "request_connection_failed"
        );
    }
}
