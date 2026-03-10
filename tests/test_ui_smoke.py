"""Thin UI smoke tests for the Fuseprobe desktop app."""

import tempfile
import tkinter
import unittest
from pathlib import Path

from src.services.history_store import HistoryStore
from src.services.request_service import RequestResult
from src.ui import FuseprobeApp


class TestFuseprobeAppSmoke(unittest.TestCase):
    """Keep GUI coverage thin and focused on startup and simple state updates."""

    def create_app(self, history_store: HistoryStore | None = None) -> FuseprobeApp:
        try:
            app = FuseprobeApp(history_store=history_store)
            app.update_idletasks()
            return app
        except tkinter.TclError as exc:
            self.skipTest(f"UI environment unavailable: {exc}")

    def test_app_initializes_with_injected_history_store(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            app = self.create_app(history_store=history_store)

            self.assertEqual(app.lbl_count.cget("text"), "0 requests")
            app.destroy()

    def test_clear_history_updates_ui_state(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            seed_history = history_store.add_entry([], "GET", "https://example.com/items", 200, 0.1)
            history_store.save(seed_history)

            app = self.create_app(history_store=history_store)
            self.assertEqual(len(app.history), 1)

            app.clear_history()

            self.assertEqual(app.history, [])
            self.assertEqual(app.lbl_count.cget("text"), "0 requests")
            app.destroy()

    def test_success_result_adds_history_and_sets_status(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            app = self.create_app(history_store=history_store)

            result = RequestResult(
                success=True,
                status_code=200,
                reason="OK",
                elapsed_seconds=0.123,
                body='{"ok": true}',
                is_json=True,
            )

            app._update_ui(result, "GET", "https://example.com/data?token=secret")

            self.assertEqual(len(app.history), 1)
            self.assertIn("Status: 200 OK", app.lbl_status.cget("text"))
            self.assertIn("token=%2A%2A%2A", app.history[0]["url"])
            app.destroy()


if __name__ == "__main__":
    unittest.main(verbosity=2)
