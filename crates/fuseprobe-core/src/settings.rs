use std::fs;
use std::io;
use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SecuritySettings {
    pub allow_unsafe_targets: bool,
    pub persist_history: bool,
}

impl Default for SecuritySettings {
    fn default() -> Self {
        Self {
            allow_unsafe_targets: false,
            persist_history: false,
        }
    }
}

impl SecuritySettings {
    pub fn load_from_file(settings_file: &Path) -> Self {
        Self::load_from_file_with_warning(settings_file).0
    }

    pub fn load_from_file_with_warning(settings_file: &Path) -> (Self, Option<String>) {
        let payload = match fs::read_to_string(settings_file) {
            Ok(payload) => payload,
            Err(_) => return (Self::default(), None),
        };

        match serde_json::from_str::<Self>(&payload) {
            Ok(settings) => (settings, None),
            Err(_) => (
                Self::default(),
                Some(
                    "Security settings could not be read. Safe defaults were restored.".to_string(),
                ),
            ),
        }
    }

    pub fn save_to_file(&self, settings_file: &Path) -> io::Result<()> {
        if let Some(parent) = settings_file.parent() {
            fs::create_dir_all(parent)?;
        }

        let temp_path = settings_file.with_extension("tmp");
        let encoded = serde_json::to_vec_pretty(self)
            .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;

        fs::write(&temp_path, encoded)?;
        fs::rename(&temp_path, settings_file)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::SecuritySettings;
    use std::fs;
    use std::path::PathBuf;

    fn temp_dir(name: &str) -> PathBuf {
        let base = std::env::temp_dir().join(format!(
            "fuseprobe-settings-{name}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).expect("temp dir should be created");
        base
    }

    #[test]
    fn defaults_are_security_first() {
        let settings = SecuritySettings::default();
        assert!(!settings.allow_unsafe_targets);
        assert!(!settings.persist_history);
    }

    #[test]
    fn round_trips_settings_through_the_file() {
        let directory = temp_dir("roundtrip");
        let settings_file = directory.join("settings.json");

        let settings = SecuritySettings {
            allow_unsafe_targets: true,
            persist_history: true,
        };
        settings
            .save_to_file(&settings_file)
            .expect("settings should be saved");

        let loaded = SecuritySettings::load_from_file(&settings_file);
        assert_eq!(loaded, settings);

        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn malformed_settings_fail_closed_to_safe_defaults() {
        let directory = temp_dir("malformed");
        let settings_file = directory.join("settings.json");
        fs::write(&settings_file, "{ not valid json").expect("payload should be written");

        let (loaded, warning) = SecuritySettings::load_from_file_with_warning(&settings_file);
        assert_eq!(loaded, SecuritySettings::default());
        assert_eq!(
            warning.as_deref(),
            Some("Security settings could not be read. Safe defaults were restored.")
        );

        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn settings_with_wrong_field_types_fail_closed() {
        let directory = temp_dir("wrong-types");
        let settings_file = directory.join("settings.json");
        fs::write(
            &settings_file,
            r#"{"allowUnsafeTargets": "yes", "persistHistory": false}"#,
        )
        .expect("payload should be written");

        let (loaded, warning) = SecuritySettings::load_from_file_with_warning(&settings_file);
        assert_eq!(loaded, SecuritySettings::default());
        assert!(warning.is_some());

        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn missing_settings_files_use_defaults_without_warning() {
        let directory = temp_dir("missing");
        let settings_file = directory.join("settings.json");

        let (loaded, warning) = SecuritySettings::load_from_file_with_warning(&settings_file);
        assert_eq!(loaded, SecuritySettings::default());
        assert!(warning.is_none());

        let _ = fs::remove_dir_all(&directory);
    }
}
