use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendRequestPayload {
    pub method: String,
    pub url: String,
    pub body: String,
    pub headers: String,
}

#[tauri::command]
pub async fn send_request(payload: SendRequestPayload) -> Result<SendRequestPayload, String> {
    Ok(payload)
}
