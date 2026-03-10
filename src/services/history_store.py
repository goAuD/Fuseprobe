"""Persistence helpers for Fuseprobe request history."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from tempfile import NamedTemporaryFile

from src.logic import redact_sensitive_url

logger = logging.getLogger(__name__)

MAX_HISTORY_ITEMS = 100


def get_config_dir() -> Path:
    """Return the current app config directory and ensure it exists."""
    if os.name == "nt":
        config_dir = Path(os.environ.get("USERPROFILE", Path.home())) / ".fuseprobe"
    else:
        config_dir = Path.home() / ".fuseprobe"
    config_dir.mkdir(parents=True, exist_ok=True)
    return config_dir


def get_legacy_config_dir() -> Path:
    """Return the legacy NanoMan config directory."""
    if os.name == "nt":
        return Path(os.environ.get("USERPROFILE", Path.home())) / ".nanoman"
    return Path.home() / ".nanoman"


class HistoryStore:
    """Load, mutate, and persist request history outside the UI layer."""

    def __init__(
        self,
        history_file: Path | None = None,
        legacy_history_file: Path | None = None,
        max_items: int = MAX_HISTORY_ITEMS,
    ):
        self.history_file = history_file or (get_config_dir() / "history.json")
        self.legacy_history_file = legacy_history_file or (get_legacy_config_dir() / "history.json")
        self.max_items = max_items
        self.history_file.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> list[dict]:
        """Load history from the current or legacy location."""
        history_path = self.history_file if self.history_file.exists() else self.legacy_history_file
        if not history_path.exists():
            return []

        try:
            with open(history_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Could not load history: %s", exc)
            return []

        raw_items = payload.get("history", []) if isinstance(payload, dict) else payload
        if not isinstance(raw_items, list):
            return []

        return [self._normalize_item(item) for item in raw_items][-self.max_items :]

    def save(self, history: list[dict]) -> None:
        """Persist history atomically to reduce corruption risk."""
        trimmed_history = [self._normalize_item(item) for item in history][-self.max_items :]

        try:
            with NamedTemporaryFile(
                "w",
                delete=False,
                dir=str(self.history_file.parent),
                encoding="utf-8",
            ) as temp_handle:
                json.dump({"history": trimmed_history}, temp_handle, indent=2, ensure_ascii=False)
                temp_path = Path(temp_handle.name)
            temp_path.replace(self.history_file)
            logger.info("Saved %s history items", len(trimmed_history))
        except (OSError, TypeError, ValueError) as exc:
            logger.error("Could not save history: %s", exc)

    def add_entry(self, history: list[dict], method: str, url: str, status_code: int, elapsed: float) -> list[dict]:
        """Return a new history list with a freshly appended entry."""
        updated_history = list(history)
        updated_history.append(
            {
                "method": method,
                "url": redact_sensitive_url(url),
                "status": status_code,
                "elapsed": elapsed,
                "time": datetime.now().strftime("%H:%M:%S"),
            }
        )
        return updated_history[-self.max_items :]

    def delete_entry(self, history: list[dict], index: int) -> list[dict]:
        """Return a new history list with one entry removed."""
        if index < 0 or index >= len(history):
            return list(history)

        updated_history = list(history)
        del updated_history[index]
        return updated_history

    def clear(self) -> list[dict]:
        """Return the cleared history representation."""
        return []

    def _normalize_item(self, item: dict) -> dict:
        """Normalize legacy or malformed history entries into the current shape."""
        item = item if isinstance(item, dict) else {}
        return {
            "method": self._coerce_method(item.get("method")),
            "url": redact_sensitive_url(self._coerce_text(item.get("url"))),
            "status": self._coerce_int(item.get("status")),
            "elapsed": self._coerce_float(item.get("elapsed")),
            "time": self._coerce_time(item.get("time")),
        }

    def _coerce_method(self, value) -> str:
        """Return a safe method label for persisted history items."""
        method = self._coerce_text(value).strip().upper()
        return method or "GET"

    def _coerce_text(self, value) -> str:
        """Return a safe text representation for persisted fields."""
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        return str(value)

    def _coerce_int(self, value, default: int = 0) -> int:
        """Safely parse an integer-like persisted value."""
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def _coerce_float(self, value, default: float = 0.0) -> float:
        """Safely parse a float-like persisted value."""
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _coerce_time(self, value) -> str:
        """Return a display-safe time string."""
        text = self._coerce_text(value).strip()
        return text or "--:--:--"
