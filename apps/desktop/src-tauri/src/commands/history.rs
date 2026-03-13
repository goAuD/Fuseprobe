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

#[tauri::command]
pub fn delete_history_entry(
    state: tauri::State<'_, AppState>,
    index: usize,
) -> Result<Vec<HistoryEntry>, String> {
    let mut history = state
        .history
        .lock()
        .map_err(|_| "history state is unavailable".to_string())?;
    history.delete(index);
    let _ = history.save_to_file(&state.history_file);
    Ok(history.all().to_vec())
}

#[tauri::command]
pub fn clear_history(state: tauri::State<'_, AppState>) -> Result<Vec<HistoryEntry>, String> {
    let mut history = state
        .history
        .lock()
        .map_err(|_| "history state is unavailable".to_string())?;
    history.clear();
    let _ = history.save_to_file(&state.history_file);
    Ok(history.all().to_vec())
}
