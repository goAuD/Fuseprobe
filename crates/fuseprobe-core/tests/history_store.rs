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
