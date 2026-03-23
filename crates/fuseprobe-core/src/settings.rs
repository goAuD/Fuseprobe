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
