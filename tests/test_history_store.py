"""High-level tests for request history persistence and privacy behavior."""

import json
import tempfile
import unittest
from pathlib import Path

from src.services.history_store import HistoryStore


class TestHistoryStore(unittest.TestCase):
    """Workflow tests for bounded, redacted history persistence."""

    def test_add_entry_redacts_sensitive_query_params(self):
        store = HistoryStore(history_file=Path(tempfile.gettempdir()) / "unused.json", max_items=2)

        history = []
        history = store.add_entry(history, "GET", "https://api.example.com/data?token=abc123", 200, 0.12)
        history = store.add_entry(history, "GET", "https://api.example.com/data?id=2", 200, 0.20)
        history = store.add_entry(history, "GET", "https://api.example.com/data?api_key=secret", 200, 0.30)

        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["url"], "https://api.example.com/data?id=2")
        self.assertIn("api_key=%2A%2A%2A", history[1]["url"])

    def test_load_uses_legacy_history_and_redacts_it(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            history_file = temp_path / "history.json"
            legacy_history_file = temp_path / "legacy-history.json"

            legacy_history_file.write_text(
                json.dumps(
                    {
                        "history": [
                            {
                                "method": "GET",
                                "url": "https://api.example.com?access_token=secret-token",
                                "status": 200,
                                "elapsed": 0.42,
                                "time": "08:00:00",
                            }
                        ]
                    }
                ),
                encoding="utf-8",
            )

            store = HistoryStore(
                history_file=history_file,
                legacy_history_file=legacy_history_file,
            )

            history = store.load()

            self.assertEqual(len(history), 1)
            self.assertIn("access_token=%2A%2A%2A", history[0]["url"])

    def test_delete_and_clear_history(self):
        store = HistoryStore(history_file=Path(tempfile.gettempdir()) / "unused.json")
        history = [
            {"method": "GET", "url": "http://localhost/a", "status": 200, "elapsed": 0.1, "time": "10:00:00"},
            {"method": "POST", "url": "http://localhost/b", "status": 201, "elapsed": 0.2, "time": "10:01:00"},
        ]

        trimmed = store.delete_entry(history, 0)

        self.assertEqual(len(trimmed), 1)
        self.assertEqual(trimmed[0]["url"], "http://localhost/b")
        self.assertEqual(store.clear(), [])

    def test_corrupt_history_file_does_not_crash(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_file = Path(temp_dir) / "history.json"
            history_file.write_text("{not json", encoding="utf-8")

            store = HistoryStore(history_file=history_file, legacy_history_file=Path(temp_dir) / "missing.json")

            self.assertEqual(store.load(), [])

    def test_save_and_load_round_trip(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_file = Path(temp_dir) / "history.json"
            store = HistoryStore(history_file=history_file, legacy_history_file=Path(temp_dir) / "missing.json")
            history = [
                {"method": "GET", "url": "https://api.example.com?token=secret", "status": 200, "elapsed": 0.1, "time": "10:00:00"}
            ]

            store.save(history)
            loaded = store.load()

            self.assertEqual(len(loaded), 1)
            self.assertIn("token=%2A%2A%2A", loaded[0]["url"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
