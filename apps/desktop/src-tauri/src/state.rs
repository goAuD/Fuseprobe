use std::env;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use fuseprobe_core::{HistoryStore, SecuritySettings};

pub struct AppState {
    pub history: Mutex<HistoryStore>,
    pub history_file: PathBuf,
    pub settings: Mutex<SecuritySettings>,
    pub settings_file: PathBuf,
}

impl AppState {
    pub fn load() -> Self {
        let settings_file = current_settings_file();
        let settings = SecuritySettings::load_from_file(&settings_file);
        let history_file = current_history_file();
        let legacy_history_file = legacy_history_file();
        let history = load_history_store(&settings, &history_file, &legacy_history_file);

        Self {
            history: Mutex::new(history),
            history_file,
            settings: Mutex::new(settings),
            settings_file,
        }
    }
}

pub(crate) fn load_history_store(
    settings: &SecuritySettings,
    history_file: &Path,
    legacy_history_file: &Path,
) -> HistoryStore {
    if settings.persist_history {
        HistoryStore::load_from_files(history_file, legacy_history_file)
    } else {
        HistoryStore::new()
    }
}

pub(crate) fn sync_history_persistence(
    history: &HistoryStore,
    history_file: &Path,
    persist_history: bool,
) -> io::Result<()> {
    if persist_history {
        return history.save_to_file(history_file);
    }

    if history_file.exists() {
        fs::remove_file(history_file)?;
    }

    Ok(())
}

fn current_history_file() -> PathBuf {
    config_dir(".fuseprobe").join("history.json")
}

fn legacy_history_file() -> PathBuf {
    config_dir(".nanoman").join("history.json")
}

fn current_settings_file() -> PathBuf {
    config_dir(".fuseprobe").join("settings.json")
}

fn config_dir(folder_name: &str) -> PathBuf {
    home_dir().join(folder_name)
}

fn home_dir() -> PathBuf {
    if let Some(home) = env::var_os("USERPROFILE").or_else(|| env::var_os("HOME")) {
        return PathBuf::from(home);
    }

    env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

#[cfg(test)]
mod tests {
    use super::{load_history_store, sync_history_persistence};
    use fuseprobe_core::{HistoryEntry, HistoryStore, SecuritySettings};
    use serde_json::json;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn skips_loading_disk_history_when_persistence_is_disabled() {
        let temp_dir = TestDir::new("history-disabled");
        let history_file = temp_dir.path().join("history.json");
        let legacy_history_file = temp_dir.path().join("legacy-history.json");

        fs::write(
            &history_file,
            serde_json::to_vec_pretty(&json!({
                "history": [
                    { "method": "GET", "url": "https://api.example.com/items?token=secret" }
                ]
            }))
            .expect("serialize history"),
        )
        .expect("write history");

        let history = load_history_store(
            &SecuritySettings {
                allow_unsafe_targets: false,
                persist_history: false,
            },
            &history_file,
            &legacy_history_file,
        );

        assert!(history.all().is_empty());
    }

    #[test]
    fn loads_disk_history_when_persistence_is_enabled() {
        let temp_dir = TestDir::new("history-enabled");
        let history_file = temp_dir.path().join("history.json");
        let legacy_history_file = temp_dir.path().join("legacy-history.json");

        fs::write(
            &history_file,
            serde_json::to_vec_pretty(&json!({
                "history": [
                    { "method": "GET", "url": "https://api.example.com/items?token=secret" }
                ]
            }))
            .expect("serialize history"),
        )
        .expect("write history");

        let history = load_history_store(
            &SecuritySettings {
                allow_unsafe_targets: false,
                persist_history: true,
            },
            &history_file,
            &legacy_history_file,
        );

        assert_eq!(history.all().len(), 1);
        assert!(history.all()[0].url.contains("token=%2A%2A%2A"));
    }

    #[test]
    fn removes_persisted_history_file_when_persistence_is_disabled() {
        let temp_dir = TestDir::new("history-disable-sync");
        let history_file = temp_dir.path().join("history.json");
        fs::write(&history_file, b"{\"history\":[]}").expect("write history");

        let history = HistoryStore::new();
        sync_history_persistence(&history, &history_file, false).expect("sync should succeed");

        assert!(!history_file.exists());
    }

    #[test]
    fn saves_history_to_disk_when_persistence_is_enabled() {
        let temp_dir = TestDir::new("history-enable-sync");
        let history_file = temp_dir.path().join("history.json");
        let mut history = HistoryStore::new();
        history.add(HistoryEntry::new(
            "GET",
            "https://api.example.com/items?page=2&token=secret#frag",
        ));

        sync_history_persistence(&history, &history_file, true).expect("sync should save");

        let saved_payload = fs::read_to_string(&history_file).expect("read history");
        assert!(saved_payload.contains("page=%2A%2A%2A"));
        assert!(saved_payload.contains("token=%2A%2A%2A"));
        assert!(!saved_payload.contains("#frag"));
    }

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new(label: &str) -> Self {
            let unique = format!(
                "{label}-{}-{}",
                std::process::id(),
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .expect("system clock before unix epoch")
                    .as_nanos()
            );
            let path = std::env::temp_dir().join(format!("fuseprobe-desktop-{unique}"));
            fs::create_dir_all(&path).expect("create temp test directory");
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }
}
