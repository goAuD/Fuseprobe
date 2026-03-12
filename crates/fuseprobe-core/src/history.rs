use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::redact_url;

const DEFAULT_MAX_ITEMS: usize = 100;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub method: String,
    pub url: String,
    pub status: i64,
    pub elapsed: f64,
    pub time: String,
}

impl HistoryEntry {
    pub fn new(method: &str, url: &str) -> Self {
        Self {
            method: coerce_method(Some(method)),
            url: redact_url(url),
            status: 0,
            elapsed: 0.0,
            time: "--:--:--".to_string(),
        }
    }
}

#[derive(Clone, Debug, Default)]
pub struct HistoryStore {
    entries: Vec<HistoryEntry>,
    max_items: usize,
}

impl HistoryStore {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
            max_items: DEFAULT_MAX_ITEMS,
        }
    }

    pub fn with_max_items(max_items: usize) -> Self {
        Self {
            entries: Vec::new(),
            max_items,
        }
    }

    pub fn add(&mut self, entry: HistoryEntry) {
        self.entries.push(HistoryEntry {
            url: redact_url(&entry.url),
            ..entry
        });
        if self.entries.len() > self.max_items {
            let overflow = self.entries.len() - self.max_items;
            self.entries.drain(0..overflow);
        }
    }

    pub fn delete(&mut self, index: usize) {
        if index < self.entries.len() {
            self.entries.remove(index);
        }
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }

    pub fn all(&self) -> &[HistoryEntry] {
        &self.entries
    }

    pub fn normalize(rows: Vec<Value>) -> Vec<HistoryEntry> {
        rows.into_iter().map(normalize_entry).collect()
    }
}

fn normalize_entry(value: Value) -> HistoryEntry {
    let object = value.as_object();
    HistoryEntry {
        method: coerce_method(
            object
                .and_then(|item| item.get("method"))
                .and_then(Value::as_str),
        ),
        url: redact_url(&coerce_text(object.and_then(|item| item.get("url")))),
        status: coerce_i64(object.and_then(|item| item.get("status"))),
        elapsed: coerce_f64(object.and_then(|item| item.get("elapsed"))),
        time: coerce_time(object.and_then(|item| item.get("time"))),
    }
}

fn coerce_method(value: Option<&str>) -> String {
    let method = value.unwrap_or_default().trim().to_ascii_uppercase();
    if method.is_empty() {
        "GET".to_string()
    } else {
        method
    }
}

fn coerce_text(value: Option<&Value>) -> String {
    match value {
        None | Some(Value::Null) => String::new(),
        Some(Value::String(text)) => text.clone(),
        Some(other) => match other {
            Value::Bool(boolean) => boolean.to_string(),
            Value::Number(number) => number.to_string(),
            _ => String::new(),
        },
    }
}

fn coerce_i64(value: Option<&Value>) -> i64 {
    match value {
        Some(Value::Number(number)) => number.as_i64().unwrap_or(0),
        Some(Value::String(text)) => text.parse().unwrap_or(0),
        _ => 0,
    }
}

fn coerce_f64(value: Option<&Value>) -> f64 {
    match value {
        Some(Value::Number(number)) => number.as_f64().unwrap_or(0.0),
        Some(Value::String(text)) => text.parse().unwrap_or(0.0),
        _ => 0.0,
    }
}

fn coerce_time(value: Option<&Value>) -> String {
    let text = coerce_text(value);
    if text.trim().is_empty() {
        "--:--:--".to_string()
    } else {
        text
    }
}
