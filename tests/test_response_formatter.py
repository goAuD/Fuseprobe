"""Focused tests for safe response formatting decisions."""

import unittest

from src.services.response_formatter import format_response_body


class TestResponseFormatter(unittest.TestCase):
    """Coverage for text, JSON, binary, and truncation output rules."""

    def test_formats_json_payloads(self):
        formatted = format_response_body("application/problem+json", b'{"error":"denied"}')

        self.assertTrue(formatted.is_json)
        self.assertFalse(formatted.is_binary)
        self.assertIn('"error"', formatted.body)
        self.assertIn("\n", formatted.body)

    def test_marks_binary_payloads(self):
        formatted = format_response_body("application/octet-stream", b"\x00\x01\x02")

        self.assertTrue(formatted.is_binary)
        self.assertFalse(formatted.is_json)
        self.assertIn("Binary response omitted", formatted.body)

    def test_supports_text_without_content_type(self):
        formatted = format_response_body("", "hello".encode("utf-8"))

        self.assertFalse(formatted.is_binary)
        self.assertEqual(formatted.body, "hello")

    def test_appends_truncation_notice(self):
        formatted = format_response_body("text/plain", b"hello", truncated=True)

        self.assertTrue(formatted.truncated)
        self.assertIn("Output truncated", formatted.body)


if __name__ == "__main__":
    unittest.main(verbosity=2)
