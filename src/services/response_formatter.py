"""Helpers for classifying and safely formatting HTTP response bodies."""

import logging

from dataclasses import dataclass

from src.logic import format_json, is_json_content_type

logger = logging.getLogger(__name__)

DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024  # 1 MiB keeps the UI responsive on large payloads.

TEXTUAL_CONTENT_TYPE_PREFIXES = (
    "text/",
    "application/javascript",
    "application/problem+json",
    "application/x-www-form-urlencoded",
    "application/xml",
)


@dataclass
class FormattedResponse:
    """Prepared response body ready for UI rendering."""

    body: str
    is_json: bool
    is_binary: bool
    truncated: bool
    content_type: str
    byte_count: int


def _extract_charset(content_type: str) -> str:
    """Return the declared charset or a safe default."""
    if not content_type:
        return "utf-8"

    for part in content_type.split(";")[1:]:
        key, _, value = part.strip().partition("=")
        if key.lower() == "charset" and value:
            return value.strip().strip('"')

    return "utf-8"


def _is_textual_content_type(content_type: str) -> bool:
    """Return True when the content type is likely safe to render as text."""
    if not content_type:
        return False

    mime_type = content_type.split(";", 1)[0].strip().lower()
    if is_json_content_type(mime_type):
        return True

    if mime_type.endswith("+xml"):
        return True

    return mime_type.startswith(TEXTUAL_CONTENT_TYPE_PREFIXES)


def _is_probably_text(raw_body: bytes) -> bool:
    """Best-effort detection for text payloads when content type is missing."""
    if not raw_body:
        return True

    try:
        raw_body.decode("utf-8")
        return True
    except UnicodeDecodeError:
        return False


def _decode_text_body(raw_body: bytes, content_type: str) -> str:
    """Decode textual content with a safe fallback for invalid charset declarations."""
    encoding = _extract_charset(content_type)

    try:
        return raw_body.decode(encoding, errors="replace")
    except LookupError:
        logger.warning("Unknown response charset %r, falling back to utf-8", encoding)
        return raw_body.decode("utf-8", errors="replace")


def format_response_body(content_type: str, raw_body: bytes, truncated: bool = False) -> FormattedResponse:
    """Convert raw bytes into a renderable response body."""
    raw_body = raw_body or b""
    mime_type = content_type.split(";", 1)[0].strip().lower()
    is_json = is_json_content_type(content_type)
    is_text = _is_textual_content_type(content_type) or (not mime_type and _is_probably_text(raw_body))

    if not is_text:
        body = f"[Binary response omitted: {mime_type or 'unknown'}, {len(raw_body)} bytes]"
        return FormattedResponse(
            body=body,
            is_json=False,
            is_binary=True,
            truncated=truncated,
            content_type=mime_type,
            byte_count=len(raw_body),
        )

    text_body = _decode_text_body(raw_body, content_type)
    rendered_body = format_json(text_body) if is_json else text_body

    if truncated:
        rendered_body = (
            f"{rendered_body}\n\n"
            f"[Output truncated at {len(raw_body)} bytes to keep Fuseprobe responsive.]"
        )

    return FormattedResponse(
        body=rendered_body,
        is_json=is_json,
        is_binary=False,
        truncated=truncated,
        content_type=mime_type,
        byte_count=len(raw_body),
    )
