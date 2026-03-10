"""Request execution service with policy-driven safety defaults."""

from __future__ import annotations

import json
from dataclasses import dataclass, field

import requests

from src.logic import parse_headers, redact_sensitive_url, validate_url
from src.services.response_formatter import DEFAULT_MAX_RESPONSE_BYTES, format_response_body


@dataclass(frozen=True)
class RequestPolicy:
    """Safety and performance limits for outbound requests."""

    timeout_seconds: int = 10
    allow_redirects: bool = False
    max_response_bytes: int = DEFAULT_MAX_RESPONSE_BYTES


@dataclass
class RequestResult:
    """Unified result object returned to the UI layer."""

    success: bool
    error: str = ""
    status_code: int = 0
    reason: str = ""
    elapsed_seconds: float = 0.0
    headers: dict[str, str] = field(default_factory=dict)
    body: str = ""
    is_json: bool = False
    is_binary: bool = False
    truncated: bool = False
    content_type: str = ""


class RequestService:
    """Execute HTTP requests with safe-by-default Fuseprobe behavior."""

    def __init__(self, policy: RequestPolicy | None = None):
        self.policy = policy or RequestPolicy()

    def send(self, method: str, url: str, payload: str = "", headers_text: str = "") -> RequestResult:
        """Validate input, execute the request, and prepare a UI-safe result."""
        if not validate_url(url):
            return RequestResult(
                success=False,
                error="Invalid or unsafe URL. Only http:// and https:// are allowed.",
            )

        try:
            json_payload = json.loads(payload) if payload and payload.strip() else None
        except json.JSONDecodeError as exc:
            return RequestResult(success=False, error=f"Invalid JSON in request body: {exc}")

        try:
            headers = parse_headers(headers_text)
        except ValueError as exc:
            return RequestResult(success=False, error=str(exc))

        try:
            response = requests.request(
                method=method.upper(),
                url=url,
                json=json_payload,
                headers=headers or {},
                timeout=self.policy.timeout_seconds,
                allow_redirects=self.policy.allow_redirects,
                stream=True,
            )
        except requests.exceptions.Timeout:
            return RequestResult(
                success=False,
                error=f"Request timed out after {self.policy.timeout_seconds} seconds",
            )
        except requests.exceptions.ConnectionError as exc:
            return RequestResult(success=False, error=f"Connection failed: {self._sanitize_error_message(exc, url)}")
        except requests.exceptions.RequestException as exc:
            return RequestResult(success=False, error=f"Request failed: {self._sanitize_error_message(exc, url)}")

        try:
            raw_body, truncated = self._read_response_body(response)
            formatted = format_response_body(
                response.headers.get("Content-Type", ""),
                raw_body,
                truncated=truncated,
            )

            if not self.policy.allow_redirects and 300 <= response.status_code < 400:
                location = response.headers.get("Location")
                if location:
                    safe_location = redact_sensitive_url(location)
                    prefix = f"Redirect not followed. Location: {safe_location}"
                    formatted.body = f"{prefix}\n\n{formatted.body}" if formatted.body else prefix

            return RequestResult(
                success=True,
                status_code=response.status_code,
                reason=response.reason,
                elapsed_seconds=response.elapsed.total_seconds(),
                headers=dict(response.headers),
                body=formatted.body,
                is_json=formatted.is_json,
                is_binary=formatted.is_binary,
                truncated=formatted.truncated,
                content_type=formatted.content_type,
            )
        finally:
            response.close()

    def _read_response_body(self, response: requests.Response) -> tuple[bytes, bool]:
        """Stream the response body up to the configured byte limit."""
        body_buffer = bytearray()
        truncated = False

        for chunk in response.iter_content(chunk_size=8192):
            if not chunk:
                continue

            remaining = self.policy.max_response_bytes - len(body_buffer)
            if remaining <= 0:
                truncated = True
                break

            if len(chunk) > remaining:
                body_buffer.extend(chunk[:remaining])
                truncated = True
                break

            body_buffer.extend(chunk)

        return bytes(body_buffer), truncated

    def _sanitize_error_message(self, error: Exception, url: str) -> str:
        """Redact sensitive URLs if a network exception includes them verbatim."""
        message = str(error)
        safe_url = redact_sensitive_url(url)
        if url and safe_url != url:
            message = message.replace(url, safe_url)
        return message
