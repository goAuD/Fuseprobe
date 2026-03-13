use fuseprobe_core::SecuritySettings;

use crate::state::{sync_history_persistence, AppState};

#[tauri::command]
pub fn load_security_settings(
    state: tauri::State<'_, AppState>,
) -> Result<SecuritySettings, String> {
    let settings = state
        .settings
        .lock()
        .map_err(|_| "security settings are unavailable".to_string())?;

    Ok(settings.clone())
}

#[tauri::command]
pub fn update_security_settings(
    state: tauri::State<'_, AppState>,
    settings: SecuritySettings,
) -> Result<SecuritySettings, String> {
    {
        let history = state
            .history
            .lock()
            .map_err(|_| "history state is unavailable".to_string())?;
        sync_history_persistence(&history, &state.history_file, settings.persist_history)
            .map_err(|error| format!("failed to sync history persistence: {error}"))?;
    }

    settings
        .save_to_file(&state.settings_file)
        .map_err(|error| format!("failed to save security settings: {error}"))?;

    let mut current = state
        .settings
        .lock()
        .map_err(|_| "security settings are unavailable".to_string())?;
    *current = settings.clone();

    Ok(settings)
}
