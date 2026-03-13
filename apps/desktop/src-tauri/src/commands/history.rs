use fuseprobe_core::HistoryEntry;

use crate::state::{sync_history_persistence, AppState};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryCommandResult {
    pub entries: Vec<HistoryEntry>,
    pub persistence_warning: Option<String>,
}

#[tauri::command]
pub fn load_history(state: tauri::State<'_, AppState>) -> Result<HistoryCommandResult, String> {
    let history = state
        .history
        .lock()
        .map_err(|_| "history state is unavailable".to_string())?;
    Ok(HistoryCommandResult {
        entries: history.all().to_vec(),
        persistence_warning: state.persistence_warning()?,
    })
}

#[tauri::command]
pub fn delete_history_entry(
    state: tauri::State<'_, AppState>,
    index: usize,
) -> Result<HistoryCommandResult, String> {
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
    let persistence_warning =
        sync_history_persistence(&history, state.history_file.as_deref(), persist_history);
    state.set_persistence_warning(persistence_warning.clone())?;
    Ok(HistoryCommandResult {
        entries: history.all().to_vec(),
        persistence_warning,
    })
}

#[tauri::command]
pub fn clear_history(state: tauri::State<'_, AppState>) -> Result<HistoryCommandResult, String> {
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
    let persistence_warning =
        sync_history_persistence(&history, state.history_file.as_deref(), persist_history);
    state.set_persistence_warning(persistence_warning.clone())?;
    Ok(HistoryCommandResult {
        entries: history.all().to_vec(),
        persistence_warning,
    })
}
