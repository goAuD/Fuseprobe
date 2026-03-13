use fuseprobe_core::HistoryEntry;

use crate::state::{sync_history_persistence, AppState};

#[tauri::command]
pub fn load_history(state: tauri::State<'_, AppState>) -> Result<Vec<HistoryEntry>, String> {
    let history = state
        .history
        .lock()
        .map_err(|_| "history state is unavailable".to_string())?;
    Ok(history.all().to_vec())
}

#[tauri::command]
pub fn delete_history_entry(
    state: tauri::State<'_, AppState>,
    index: usize,
) -> Result<Vec<HistoryEntry>, String> {
    let persist_history = state
        .settings
        .lock()
        .map_err(|_| "security settings are unavailable".to_string())?
        .persist_history;
    let mut history = state
        .history
        .lock()
        .map_err(|_| "history state is unavailable".to_string())?;
    history.delete(index);
    sync_history_persistence(&history, &state.history_file, persist_history)
        .map_err(|error| format!("failed to sync history persistence: {error}"))?;
    Ok(history.all().to_vec())
}

#[tauri::command]
pub fn clear_history(state: tauri::State<'_, AppState>) -> Result<Vec<HistoryEntry>, String> {
    let persist_history = state
        .settings
        .lock()
        .map_err(|_| "security settings are unavailable".to_string())?
        .persist_history;
    let mut history = state
        .history
        .lock()
        .map_err(|_| "history state is unavailable".to_string())?;
    history.clear();
    sync_history_persistence(&history, &state.history_file, persist_history)
        .map_err(|error| format!("failed to sync history persistence: {error}"))?;
    Ok(history.all().to_vec())
}
