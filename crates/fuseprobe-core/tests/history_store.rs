use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use fuseprobe_core::{HistoryEntry, HistoryStore};
use serde_json::json;

#[test]
fn clear_history_removes_all_items() {
    let mut store = HistoryStore::new();
    store.add(HistoryEntry::new("GET", "https://example.com"));
    store.clear();
    assert!(store.all().is_empty());
}

#[test]
fn add_entry_redacts_sensitive_query_params_and_enforces_bounds() {
    let mut store = HistoryStore::with_max_items(2);

    store.add(HistoryEntry::new(
        "GET",
        "https://api.example.com/data?token=abc123",
    ));
    store.add(HistoryEntry::new(
        "GET",
        "https://api.example.com/data?id=2",
    ));
    store.add(HistoryEntry::new(
        "GET",
        "https://api.example.com/data?api_key=secret",
    ));

    assert_eq!(store.all().len(), 2);
    assert_eq!(store.all()[0].url, "https://api.example.com/data?id=2");
    assert!(store.all()[1].url.contains("api_key=%2A%2A%2A"));
}

#[test]
fn invalid_history_rows_are_normalized_into_safe_defaults() {
    let normalized = HistoryStore::normalize(vec![
        json!({"method": null, "url": null, "status": "bad", "elapsed": "oops", "time": null}),
        json!(["not-a-dict"]),
        json!({"method": "post", "url": "https://api.example.com?token=secret", "status": "201", "elapsed": "0.42"}),
    ]);

    assert_eq!(normalized.len(), 3);
    assert_eq!(
        normalized[0],
        HistoryEntry {
            method: "GET".to_string(),
            url: "".to_string(),
            status: 0,
            elapsed: 0.0,
            time: "--:--:--".to_string(),
        }
    );
    assert_eq!(
        normalized[1],
        HistoryEntry {
            method: "GET".to_string(),
            url: "".to_string(),
            status: 0,
            elapsed: 0.0,
            time: "--:--:--".to_string(),
        }
    );
    assert_eq!(normalized[2].method, "POST");
    assert_eq!(normalized[2].status, 201);
    assert_eq!(normalized[2].elapsed, 0.42);
    assert!(normalized[2].url.contains("token=%2A%2A%2A"));
}

#[test]
fn delete_invalid_index_is_a_noop() {
    let mut store = HistoryStore::new();
    store.add(HistoryEntry::new("GET", "https://example.com"));
    store.delete(5);
    assert_eq!(store.all().len(), 1);
}

#[test]
fn load_from_files_prefers_current_history_and_normalizes_rows() {
    let temp_dir = TestDir::new("current-history");
    let current_history_file = temp_dir.path().join("history.json");
    let legacy_history_file = temp_dir.path().join("legacy-history.json");

    fs::write(
        &current_history_file,
        serde_json::to_vec_pretty(&json!({
            "history": [
                {
                    "method": "post",
                    "url": "https://api.example.com/items?token=secret",
                    "status": "201",
                    "elapsed": "0.42",
                    "time": "10:15:00"
                }
            ]
        }))
        .expect("serialize current history fixture"),
    )
    .expect("write current history fixture");

    fs::write(
        &legacy_history_file,
        serde_json::to_vec_pretty(&json!({
            "history": [
                {
                    "method": "GET",
                    "url": "https://legacy.example.com/users",
                    "status": 200,
                    "elapsed": 1.0,
                    "time": "10:00:00"
                }
            ]
        }))
        .expect("serialize legacy history fixture"),
    )
    .expect("write legacy history fixture");

    let store = HistoryStore::load_from_files(&current_history_file, &legacy_history_file);

    assert_eq!(store.all().len(), 1);
    assert_eq!(store.all()[0].method, "POST");
    assert_eq!(store.all()[0].status, 201);
    assert_eq!(store.all()[0].elapsed, 0.42);
    assert_eq!(store.all()[0].time, "10:15:00");
    assert!(store.all()[0].url.contains("token=%2A%2A%2A"));
}

#[test]
fn load_from_files_uses_legacy_history_when_current_is_missing() {
    let temp_dir = TestDir::new("legacy-history");
    let current_history_file = temp_dir.path().join("history.json");
    let legacy_history_file = temp_dir.path().join("legacy-history.json");

    fs::write(
        &legacy_history_file,
        serde_json::to_vec_pretty(&json!({
            "history": [
                {
                    "method": "GET",
                    "url": "https://legacy.example.com/users?api_key=secret",
                    "status": 200,
                    "elapsed": 1.0,
                    "time": "10:00:00"
                }
            ]
        }))
        .expect("serialize legacy history fixture"),
    )
    .expect("write legacy history fixture");

    let store = HistoryStore::load_from_files(&current_history_file, &legacy_history_file);

    assert_eq!(store.all().len(), 1);
    assert_eq!(store.all()[0].method, "GET");
    assert!(store.all()[0].url.contains("api_key=%2A%2A%2A"));
}

#[test]
fn save_to_file_round_trips_history_entries() {
    let temp_dir = TestDir::new("save-history");
    let history_file = temp_dir.path().join("history.json");
    let legacy_history_file = temp_dir.path().join("legacy-history.json");
    let mut store = HistoryStore::new();

    store.add(HistoryEntry::new(
        "GET",
        "https://api.example.com/items?access_token=secret",
    ));
    store.save_to_file(&history_file).expect("save history to disk");

    let saved_payload = fs::read_to_string(&history_file).expect("read saved history");
    assert!(saved_payload.contains("\"history\""));

    let loaded = HistoryStore::load_from_files(&history_file, &legacy_history_file);
    assert_eq!(loaded.all().len(), 1);
    assert!(loaded.all()[0].url.contains("access_token=%2A%2A%2A"));
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
        let path = std::env::temp_dir().join(format!("fuseprobe-core-{unique}"));
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
