use std::env;
use std::path::PathBuf;
use std::sync::Mutex;

use fuseprobe_core::HistoryStore;

pub struct AppState {
    pub history: Mutex<HistoryStore>,
    pub history_file: PathBuf,
}

impl AppState {
    pub fn load() -> Self {
        let history_file = current_history_file();
        let legacy_history_file = legacy_history_file();
        let history = HistoryStore::load_from_files(&history_file, &legacy_history_file);

        Self {
            history: Mutex::new(history),
            history_file,
        }
    }
}

fn current_history_file() -> PathBuf {
    config_dir(".fuseprobe").join("history.json")
}

fn legacy_history_file() -> PathBuf {
    config_dir(".nanoman").join("history.json")
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
