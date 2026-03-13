use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};

use fuseprobe_core::{HistoryStore, SecuritySettings};

use crate::paths::resolve_storage_paths;

pub struct AppState {
    pub history: Mutex<HistoryStore>,
    pub history_file: Option<PathBuf>,
    pub settings: Mutex<SecuritySettings>,
    pub settings_file: Option<PathBuf>,
    persistence_warning: Mutex<Option<String>>,
    request_in_flight: AtomicBool,
}

impl AppState {
    pub fn load() -> Self {
        let mut startup_warning = None;
        let (history_file, settings_file, legacy_history_files, legacy_settings_files) =
            match resolve_storage_paths() {
                Ok(paths) => (
                    Some(paths.history_file),
                    Some(paths.settings_file),
                    paths.legacy_history_files,
                    paths.legacy_settings_files,
                ),
                Err(error) => {
                    startup_warning = Some(error);
                    (None, None, Vec::new(), Vec::new())
                }
            };
        let (settings, settings_warning) =
            load_security_settings(settings_file.as_deref(), &legacy_settings_files);
        startup_warning = merge_warnings(startup_warning, settings_warning);
        let (history, history_warning) =
            load_history_store(&settings, history_file.as_deref(), &legacy_history_files);
        startup_warning = merge_warnings(startup_warning, history_warning);

        Self {
            history: Mutex::new(history),
            history_file,
            settings: Mutex::new(settings),
            settings_file,
            persistence_warning: Mutex::new(startup_warning),
            request_in_flight: AtomicBool::new(false),
        }
    }

    pub fn persistence_warning(&self) -> Result<Option<String>, String> {
        self.persistence_warning
            .lock()
            .map(|warning| warning.clone())
            .map_err(|_| "persistence warning state is unavailable".to_string())
    }

    pub fn set_persistence_warning(&self, warning: Option<String>) -> Result<(), String> {
        let mut current = self
            .persistence_warning
            .lock()
            .map_err(|_| "persistence warning state is unavailable".to_string())?;
        *current = warning;
        Ok(())
    }

    pub fn try_begin_request(&self) -> Result<RequestFlightGuard<'_>, String> {
        self.request_in_flight
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map_err(|_| "A request is already in progress.".to_string())?;

        Ok(RequestFlightGuard {
            request_in_flight: &self.request_in_flight,
        })
    }
}

#[derive(Debug)]
pub struct RequestFlightGuard<'a> {
    request_in_flight: &'a AtomicBool,
}

impl Drop for RequestFlightGuard<'_> {
    fn drop(&mut self) {
        self.request_in_flight.store(false, Ordering::Release);
    }
}

pub(crate) fn load_security_settings(
    settings_file: Option<&Path>,
    legacy_settings_files: &[PathBuf],
) -> (SecuritySettings, Option<String>) {
    let Some(settings_file) = settings_file else {
        return (SecuritySettings::default(), None);
    };

    if settings_file.exists() {
        return SecuritySettings::load_from_file_with_warning(settings_file);
    }

    if let Some(legacy_file) = first_existing_path(legacy_settings_files) {
        return SecuritySettings::load_from_file_with_warning(legacy_file);
    }

    (SecuritySettings::default(), None)
}

pub(crate) fn load_history_store(
    settings: &SecuritySettings,
    history_file: Option<&Path>,
    legacy_history_files: &[PathBuf],
) -> (HistoryStore, Option<String>) {
    if !settings.persist_history {
        return (HistoryStore::new(), None);
    }

    let Some(history_file) = history_file else {
        return (
            HistoryStore::new(),
            Some(
                "Persistent history is enabled, but Fuseprobe could not resolve a local storage path."
                    .to_string(),
            ),
        );
    };

    let legacy_file = first_existing_path(legacy_history_files)
        .unwrap_or_else(|| Path::new("__missing_fuseprobe_legacy_history__"));

    HistoryStore::load_from_files_with_warning(history_file, legacy_file)
}

pub(crate) fn sync_history_persistence(
    history: &HistoryStore,
    history_file: Option<&Path>,
    persist_history: bool,
) -> Option<String> {
    if persist_history {
        let Some(history_file) = history_file else {
            return Some(
                "Persistent history is enabled, but Fuseprobe could not resolve a local storage path."
                    .to_string(),
            );
        };

        return history.save_to_file(history_file).err().map(|_| {
            "Persistent history could not be saved. Session history remains available.".to_string()
        });
    }

    let Some(history_file) = history_file else {
        return None;
    };

    if history_file.exists() && fs::remove_file(history_file).is_err() {
        return Some(
            "Persistent history could not be removed. Session-only history remains active."
                .to_string(),
        );
    }

    None
}

fn merge_warnings(current: Option<String>, next: Option<String>) -> Option<String> {
    match (current, next) {
        (Some(current), Some(next)) => Some(format!("{current} {next}")),
        (Some(current), None) => Some(current),
        (None, Some(next)) => Some(next),
        (None, None) => None,
    }
}

fn first_existing_path(paths: &[PathBuf]) -> Option<&Path> {
    paths
        .iter()
        .find(|path| path.exists())
        .map(PathBuf::as_path)
}

#[cfg(test)]
mod tests {
    use super::{load_history_store, load_security_settings, sync_history_persistence, AppState};
    use fuseprobe_core::{HistoryEntry, HistoryStore, SecuritySettings};
    use serde_json::json;
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::sync::{atomic::AtomicBool, Mutex};
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

        let (history, warning) = load_history_store(
            &SecuritySettings {
                allow_unsafe_targets: false,
                persist_history: false,
            },
            Some(&history_file),
            std::slice::from_ref(&legacy_history_file),
        );

        assert!(history.all().is_empty());
        assert!(warning.is_none());
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

        let (history, warning) = load_history_store(
            &SecuritySettings {
                allow_unsafe_targets: false,
                persist_history: true,
            },
            Some(&history_file),
            std::slice::from_ref(&legacy_history_file),
        );

        assert_eq!(history.all().len(), 1);
        assert!(history.all()[0].url.contains("token=%2A%2A%2A"));
        assert!(warning.is_none());
    }

    #[test]
    fn returns_warning_when_persistent_history_is_enabled_without_a_storage_path() {
        let (history, warning) = load_history_store(
            &SecuritySettings {
                allow_unsafe_targets: false,
                persist_history: true,
            },
            None,
            &[],
        );

        assert!(history.all().is_empty());
        assert_eq!(
            warning,
            Some(
                "Persistent history is enabled, but Fuseprobe could not resolve a local storage path."
                    .to_string()
            ),
        );
    }

    #[test]
    fn removes_persisted_history_file_when_persistence_is_disabled() {
        let temp_dir = TestDir::new("history-disable-sync");
        let history_file = temp_dir.path().join("history.json");
        fs::write(&history_file, b"{\"history\":[]}").expect("write history");

        let history = HistoryStore::new();
        let warning = sync_history_persistence(&history, Some(&history_file), false);

        assert!(!history_file.exists());
        assert!(warning.is_none());
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

        let warning = sync_history_persistence(&history, Some(&history_file), true);

        let saved_payload = fs::read_to_string(&history_file).expect("read history");
        assert!(saved_payload.contains("page=%2A%2A%2A"));
        assert!(saved_payload.contains("token=%2A%2A%2A"));
        assert!(!saved_payload.contains("#frag"));
        assert!(warning.is_none());
    }

    #[test]
    fn warns_when_persistent_history_has_no_storage_path() {
        let history = HistoryStore::new();

        let warning = sync_history_persistence(&history, None, true);

        assert_eq!(
            warning,
            Some(
                "Persistent history is enabled, but Fuseprobe could not resolve a local storage path."
                    .to_string()
            ),
        );
    }

    #[test]
    fn loads_legacy_settings_when_current_settings_are_missing() {
        let temp_dir = TestDir::new("legacy-settings");
        let legacy_settings_file = temp_dir.path().join("settings.json");

        fs::write(
            &legacy_settings_file,
            serde_json::to_vec_pretty(&SecuritySettings {
                allow_unsafe_targets: true,
                persist_history: true,
            })
            .expect("serialize settings"),
        )
        .expect("write settings");

        let (settings, warning) = load_security_settings(
            Some(&temp_dir.path().join("missing.json")),
            &[legacy_settings_file],
        );

        assert_eq!(
            settings,
            SecuritySettings {
                allow_unsafe_targets: true,
                persist_history: true,
            }
        );
        assert!(warning.is_none());
    }

    #[test]
    fn rejects_a_second_request_while_one_is_in_flight() {
        let state = test_state();
        let first_guard = state
            .try_begin_request()
            .expect("first request slot should be available");

        let error = state
            .try_begin_request()
            .expect_err("second request slot should be rejected");

        drop(first_guard);

        assert_eq!(error, "A request is already in progress.");
        assert!(state.try_begin_request().is_ok());
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

    fn test_state() -> AppState {
        AppState {
            history: Mutex::new(HistoryStore::new()),
            history_file: None,
            settings: Mutex::new(SecuritySettings::default()),
            settings_file: None,
            persistence_warning: Mutex::new(None),
            request_in_flight: AtomicBool::new(false),
        }
    }
}
