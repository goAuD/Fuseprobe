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
    confirmation: Option<bool>,
) -> Result<SecuritySettings, String> {
    {
        let current = state
            .settings
            .lock()
            .map_err(|_| "settings_unavailable".to_string())?;
        validate_settings_transition(&current, &settings, confirmation.unwrap_or(false))?;
    }

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

/// Backend enforcement of the "risky settings need explicit confirmation"
/// promise (audit finding E). The React confirmation modal is UX only; a
/// malicious or scripted frontend must not be able to enable a risky setting
/// without sending the confirmation flag, so the transition is gated here.
///
/// Returns `Err("settings_confirmation_required")` when a risky setting is
/// being enabled without `confirmed == true`.
fn validate_settings_transition(
    current: &SecuritySettings,
    next: &SecuritySettings,
    confirmed: bool,
) -> Result<(), String> {
    let enables = |before: bool, after: bool| !before && after;

    if (enables(current.allow_unsafe_targets, next.allow_unsafe_targets)
        || enables(current.persist_history, next.persist_history))
        && !confirmed
    {
        return Err("settings_confirmation_required".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_settings_transition;
    use fuseprobe_core::SecuritySettings;

    fn settings(allow_unsafe_targets: bool, persist_history: bool) -> SecuritySettings {
        SecuritySettings {
            allow_unsafe_targets,
            persist_history,
        }
    }

    #[test]
    fn enabling_unsafe_targets_requires_confirmation() {
        let error = validate_settings_transition(
            &settings(false, false),
            &settings(true, false),
            false,
        )
        .expect_err("enabling unsafe targets must require confirmation");

        assert_eq!(error, "settings_confirmation_required");
    }

    #[test]
    fn missing_confirmation_is_treated_as_not_confirmed() {
        let error = validate_settings_transition(
            &settings(false, false),
            &settings(false, true),
            false,
        )
        .expect_err("a missing confirmation must not enable history persistence");

        assert_eq!(error, "settings_confirmation_required");
    }

    #[test]
    fn confirmed_enable_is_accepted() {
        validate_settings_transition(&settings(false, false), &settings(true, true), true)
            .expect("an explicit confirmation must allow enabling risky settings");
    }

    #[test]
    fn disabling_and_unchanged_settings_never_require_confirmation() {
        validate_settings_transition(&settings(true, true), &settings(false, false), false)
            .expect("disabling risky settings must not require confirmation");
        validate_settings_transition(&settings(true, false), &settings(true, false), false)
            .expect("unchanged settings must not require confirmation");
        validate_settings_transition(&settings(false, false), &settings(false, false), false)
            .expect("unchanged settings must not require confirmation");
    }

    #[test]
    fn partial_changes_still_gate_the_enabled_setting() {
        let error = validate_settings_transition(
            &settings(true, false),
            &settings(true, true),
            false,
        )
        .expect_err("enabling history persistence must require confirmation");

        assert_eq!(error, "settings_confirmation_required");
    }
}
