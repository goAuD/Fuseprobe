use std::sync::Mutex;

use fuseprobe_core::HistoryStore;

#[derive(Default)]
pub struct AppState {
    pub history: Mutex<HistoryStore>,
}
