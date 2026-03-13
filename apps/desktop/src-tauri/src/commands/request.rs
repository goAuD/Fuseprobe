use chrono::Local;

use fuseprobe_core::{execute_request, HistoryEntry, RequestOptions};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use crate::state::AppState;

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
    pub status_line: String,
    pub duration_ms: u64,
    pub size_label: String,
    pub content_type: String,
    pub charset: String,
    pub response_text: String,
    pub raw_response_text: String,
    pub response_headers: BTreeMap<String, String>,
    pub policy_note: String,
}

#[tauri::command]
pub async fn send_request(
    state: tauri::State<'_, AppState>,
    payload: SendRequestPayload,
) -> Result<SendRequestResult, String> {
    let payload_for_core = payload.clone();
    let options = RequestOptions::default();

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
    .map_err(|_| "desktop request worker failed".to_string())??;

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
        .map_err(|_| "history state is unavailable".to_string())?;
    history.add(history_entry);
    let _ = history.save_to_file(&state.history_file);

    Ok(SendRequestResult {
        request: payload,
        status_line: format!("{} {}", executed.status_code, executed.reason).trim().to_string(),
        duration_ms: executed.elapsed_ms.round() as u64,
        size_label: format_byte_count(executed.byte_count),
        content_type: if executed.content_type.is_empty() {
            "unknown".to_string()
        } else {
            executed.content_type
        },
        charset: executed.charset,
        response_text: executed.body,
        raw_response_text: executed.raw_body,
        response_headers: executed.headers,
        policy_note: "redirects disabled by policy".to_string(),
    })
}

fn format_byte_count(byte_count: usize) -> String {
    if byte_count < 1024 {
        format!("{byte_count} B")
    } else if byte_count < 1024 * 1024 {
        format!("{:.1} KB", byte_count as f64 / 1024.0)
    } else {
        format!("{:.2} MB", byte_count as f64 / (1024.0 * 1024.0))
    }
}

fn current_time_label() -> String {
    Local::now().format("%H:%M:%S").to_string()
}
