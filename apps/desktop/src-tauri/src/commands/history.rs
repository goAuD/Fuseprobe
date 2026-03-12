use fuseprobe_core::HistoryEntry;

use crate::state::AppState;

#[tauri::command]
pub fn load_history(state: tauri::State<'_, AppState>) -> Result<Vec<HistoryEntry>, String> {
    let history = state
        .history
        .lock()
        .map_err(|_| "history state is unavailable".to_string())?;
    Ok(history.all().to_vec())
}
