use fuseprobe_core::SecuritySettings;

use crate::state::AppState;

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
