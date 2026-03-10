"""High-level tests for safe request execution and response handling."""

import unittest
from unittest.mock import patch

import requests

from src.services.request_service import RequestPolicy, RequestService


class FakeElapsed:
    def __init__(self, seconds: float):
        self._seconds = seconds

    def total_seconds(self) -> float:
        return self._seconds


class FakeResponse:
    def __init__(self, status_code=200, reason="OK", headers=None, chunks=None, elapsed=0.25):
        self.status_code = status_code
        self.reason = reason
        self.headers = headers or {}
        self._chunks = chunks or [b""]
        self.elapsed = FakeElapsed(elapsed)
        self.closed = False

    def iter_content(self, chunk_size=8192):  # noqa: ARG002 - mirrors requests.Response API
        for chunk in self._chunks:
            yield chunk

    def close(self):
        self.closed = True


class TestRequestService(unittest.TestCase):
    """Workflow tests for safe-by-default request execution."""

    def test_redirects_are_not_followed_by_default(self):
        service = RequestService()
        redirect_response = FakeResponse(
            status_code=302,
            reason="Found",
            headers={"Location": "https://example.com/next?token=secret"},
            chunks=[b""],
        )

        with patch("src.services.request_service.requests.request", return_value=redirect_response) as request_mock:
            result = service.send("GET", "https://example.com/start", "", "")

        self.assertTrue(result.success)
        self.assertEqual(result.status_code, 302)
        self.assertIn("Redirect not followed.", result.body)
        self.assertIn("token=%2A%2A%2A", result.body)
        self.assertFalse(request_mock.call_args.kwargs["allow_redirects"])
        self.assertTrue(redirect_response.closed)

    def test_large_text_response_is_truncated(self):
        service = RequestService(policy=RequestPolicy(max_response_bytes=12))
        response = FakeResponse(
            headers={"Content-Type": "text/plain; charset=utf-8"},
            chunks=[b"hello ", b"world", b" and more"],
        )

        with patch("src.services.request_service.requests.request", return_value=response):
            result = service.send("GET", "https://example.com/data", "", "")

        self.assertTrue(result.success)
        self.assertTrue(result.truncated)
        self.assertTrue(result.body.startswith("hello world "))
        self.assertIn("Output truncated", result.body)

    def test_binary_response_is_not_rendered_as_text(self):
        service = RequestService()
        response = FakeResponse(
            headers={"Content-Type": "image/png"},
            chunks=[b"\x89PNG\r\n\x1a\n\x00\x00"],
        )

        with patch("src.services.request_service.requests.request", return_value=response):
            result = service.send("GET", "https://example.com/image", "", "")

        self.assertTrue(result.success)
        self.assertTrue(result.is_binary)
        self.assertFalse(result.is_json)
        self.assertIn("Binary response omitted", result.body)

    def test_invalid_json_body_returns_error_without_network_call(self):
        service = RequestService()

        with patch("src.services.request_service.requests.request") as request_mock:
            result = service.send("POST", "https://example.com/data", "{bad json", "")

        self.assertFalse(result.success)
        self.assertIn("Invalid JSON", result.error)
        request_mock.assert_not_called()

    def test_invalid_headers_return_error_without_network_call(self):
        service = RequestService()

        with patch("src.services.request_service.requests.request") as request_mock:
            result = service.send("GET", "https://example.com/data", "", "Authorization Bearer token123")

        self.assertFalse(result.success)
        self.assertIn("expected 'Name: Value'", result.error)
        request_mock.assert_not_called()

    def test_request_errors_redact_sensitive_urls(self):
        service = RequestService()
        url = "https://example.com/data?token=secret-value"
        request_error = Exception(f"boom while calling {url}")

        with patch(
            "src.services.request_service.requests.request",
            side_effect=requests.exceptions.RequestException(request_error),
        ):
            result = service.send("GET", url, "", "")

        self.assertFalse(result.success)
        self.assertIn("token=%2A%2A%2A", result.error)
        self.assertNotIn("secret-value", result.error)


if __name__ == "__main__":
    unittest.main(verbosity=2)
