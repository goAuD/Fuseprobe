use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use fuseprobe_core::SecuritySettings;

#[test]
fn defaults_to_safe_settings() {
    let settings = SecuritySettings::default();
    assert!(!settings.allow_unsafe_targets);
    assert!(!settings.persist_history);
}

#[test]
fn loads_defaults_when_settings_file_is_missing() {
    let missing_path = unique_settings_path("missing");
    let settings = SecuritySettings::load_from_file(&missing_path);
    assert_eq!(settings, SecuritySettings::default());
}

#[test]
fn saves_and_loads_security_settings() {
    let settings_path = unique_settings_path("roundtrip");
    let settings = SecuritySettings {
        allow_unsafe_targets: true,
        persist_history: true,
    };

    settings
        .save_to_file(&settings_path)
        .expect("settings should save");

    let loaded = SecuritySettings::load_from_file(&settings_path);
    assert_eq!(loaded, settings);

    if settings_path.exists() {
        fs::remove_file(&settings_path).expect("settings file cleanup should succeed");
    }
}

fn unique_settings_path(suffix: &str) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be after unix epoch")
        .as_nanos();

    std::env::temp_dir().join(format!(
        "fuseprobe-security-settings-{suffix}-{}-{timestamp}.json",
        std::process::id()
    ))
}
