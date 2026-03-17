use fuseprobe_core::SecuritySettings;

use crate::state::{sync_history_persistence, AppState};

#[tauri::command]
pub fn load_security_settings(
    state: tauri::State<'_, AppState>,
) -> Result<SecuritySettings, String> {
    let settings = state
        .settings
        .lock()
        .map_err(|_| "settings_unavailable".to_string())?;

    Ok(settings.clone())
}

#[tauri::command]
pub fn update_security_settings(
    state: tauri::State<'_, AppState>,
    settings: SecuritySettings,
) -> Result<SecuritySettings, String> {
    let persistence_warning = {
        let history = state
            .history
            .lock()
            .map_err(|_| "history_unavailable".to_string())?;
        sync_history_persistence(
            &history,
            state.history_file.as_deref(),
            settings.persist_history,
        )
    };
    state.set_persistence_warning(persistence_warning)?;

    let settings_file = state.settings_file.as_deref().ok_or_else(|| {
        "settings_save_unavailable".to_string()
    })?;

    {
        settings
            .save_to_file(settings_file)
            .map_err(|_| "settings_save_failed".to_string())?;
    }

    let mut current = state
        .settings
        .lock()
        .map_err(|_| "settings_unavailable".to_string())?;
    *current = settings.clone();

    Ok(settings)
}
