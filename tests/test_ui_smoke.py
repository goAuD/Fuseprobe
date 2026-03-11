"""Thin UI smoke tests for the Fuseprobe desktop app."""

import tempfile
import tkinter
import unittest
from pathlib import Path
from unittest.mock import patch

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

    def test_request_editors_start_empty_for_safe_defaults(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            app = self.create_app(history_store=history_store)

            self.assertEqual(app.txt_body.get("0.0", "end").strip(), "")
            self.assertEqual(app.txt_headers.get("0.0", "end").strip(), "")
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

    def test_clear_history_noops_cleanly_when_already_empty(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            app = self.create_app(history_store=history_store)

            with patch.object(app.history_store, "save") as save_mock:
                app.clear_history()

            self.assertEqual(app.history, [])
            self.assertEqual(app.lbl_status.cget("text"), "History is already empty.")
            save_mock.assert_not_called()
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

    def test_send_request_thread_snapshots_widget_input_before_worker_start(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            app = self.create_app(history_store=history_store)
            app.method_var.set("POST")
            app.entry_url.delete(0, "end")
            app.entry_url.insert(0, "https://example.com/data?token=secret")
            app.txt_body.delete("0.0", "end")
            app.txt_body.insert("0.0", '{"name":"fuseprobe"}')
            app.txt_headers.delete("0.0", "end")
            app.txt_headers.insert("0.0", "Content-Type: application/json")

            with patch("src.ui.threading.Thread") as thread_mock:
                app.send_request_thread()

            _, kwargs = thread_mock.call_args
            self.assertEqual(kwargs["args"], (1, "POST", "https://example.com/data?token=secret", '{"name":"fuseprobe"}', "Content-Type: application/json"))
            self.assertTrue(kwargs["daemon"])
            self.assertEqual(app.lbl_status.cget("text"), "Sending request...")
            thread_mock.return_value.start.assert_called_once()
            app.destroy()

    def test_stale_request_result_is_ignored(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            app = self.create_app(history_store=history_store)
            app._active_request_id = 2
            app.btn_send.configure(state="disabled", text="...")

            result = RequestResult(
                success=True,
                status_code=200,
                reason="OK",
                elapsed_seconds=0.111,
                body='{"ok": true}',
                is_json=True,
            )

            app._apply_request_result(1, result, "GET", "https://example.com/ignored")

            self.assertEqual(app.history, [])
            self.assertEqual(app.btn_send.cget("state"), "disabled")
            self.assertNotIn("Status: 200 OK", app.lbl_status.cget("text"))
            app.destroy()

    def test_delete_invalid_history_item_does_not_save_or_mutate(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            seed_history = history_store.add_entry([], "GET", "https://example.com/items", 200, 0.1)
            history_store.save(seed_history)
            app = self.create_app(history_store=history_store)

            with patch.object(app.history_store, "save") as save_mock:
                app.delete_history_item(99)

            self.assertEqual(len(app.history), 1)
            self.assertEqual(app.lbl_status.cget("text"), "History entry not found.")
            save_mock.assert_not_called()
            app.destroy()

    def test_on_close_skips_save_when_history_is_clean(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            history_store = HistoryStore(
                history_file=Path(temp_dir) / "history.json",
                legacy_history_file=Path(temp_dir) / "legacy.json",
            )
            app = self.create_app(history_store=history_store)

            with patch.object(app.history_store, "save") as save_mock, patch.object(app, "destroy") as destroy_mock:
                app.on_close()

            save_mock.assert_not_called()
            destroy_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main(verbosity=2)
