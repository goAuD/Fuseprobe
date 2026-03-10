"""
Fuseprobe Unit Tests
Tests for URL validation, redaction, JSON formatting, and header parsing.
Run with: python -m pytest tests/ -v
"""

import unittest
from src.logic import (
    format_json,
    is_json_content_type,
    parse_headers,
    redact_sensitive_url,
    validate_url,
)


class TestURLValidation(unittest.TestCase):
    """Tests for URL validation - Security critical!"""
    
    def test_valid_https_urls(self):
        """Test valid HTTPS URLs pass validation."""
        valid_urls = [
            "https://google.com",
            "https://api.example.com/v1/data",
            "https://chseets.com/api",
            "https://sub.domain.example.org/path?query=value",
            "https://192.168.1.1:8080/api",
        ]
        for url in valid_urls:
            with self.subTest(url=url):
                self.assertTrue(validate_url(url), f"Should be valid: {url}")
    
    def test_valid_http_urls(self):
        """Test valid HTTP URLs pass validation."""
        valid_urls = [
            "http://localhost",
            "http://localhost:8000",
            "http://127.0.0.1:5000/api",
            "http://example.com",
            "https://api.example.com?query=value",
        ]
        for url in valid_urls:
            with self.subTest(url=url):
                self.assertTrue(validate_url(url), f"Should be valid: {url}")
    
    def test_valid_intranet_urls(self):
        """Test intranet URLs without TLD pass validation (v1.2.0 feature)."""
        valid_urls = [
            "http://intranet",
            "http://intranet/api",
            "http://server1:8080/data",
            "http://myserver/api/v1/users",
            "https://internal-api:3000",
        ]
        for url in valid_urls:
            with self.subTest(url=url):
                self.assertTrue(validate_url(url), f"Should be valid: {url}")
    
    def test_invalid_protocols_rejected(self):
        """Security: Non-HTTP protocols must be rejected."""
        dangerous_urls = [
            "ftp://malicious.com/file",
            "file:///etc/passwd",
            "javascript:alert('XSS')",
            "data:text/html,<script>alert('XSS')</script>",
            "vbscript:msgbox('XSS')",
        ]
        for url in dangerous_urls:
            with self.subTest(url=url):
                self.assertFalse(validate_url(url), f"Should be rejected: {url}")
    
    def test_malformed_urls_rejected(self):
        """Test malformed URLs are rejected."""
        bad_urls = [
            "",
            "   ",
            "not a url at all",
            "://missing-protocol.com",
            "https://",
            "http://",
            "https://api.example.com:99999/test",
            "https://bad host.example.com",
            None,
        ]
        for url in bad_urls:
            with self.subTest(url=url):
                self.assertFalse(validate_url(url), f"Should be rejected: {url}")


class TestJSONFormatting(unittest.TestCase):
    """Tests for JSON formatting."""
    
    def test_format_valid_json(self):
        """Test pretty-printing valid JSON."""
        ugly = '{"name":"Nano","version":1}'
        pretty = format_json(ugly)
        
        self.assertIn("\n", pretty, "Should have newlines")
        self.assertIn("    ", pretty, "Should have indentation")
        self.assertIn('"name"', pretty)
        self.assertIn('"Nano"', pretty)
    
    def test_format_invalid_json_returns_original(self):
        """Test that invalid JSON returns original string."""
        invalid = "this is not json"
        result = format_json(invalid)
        self.assertEqual(result, invalid)
    
    def test_format_empty_string(self):
        """Test empty string handling."""
        self.assertEqual(format_json(""), "")
        self.assertEqual(format_json(None), None)


class TestURLRedaction(unittest.TestCase):
    """Tests for masking sensitive values in stored URLs."""

    def test_redacts_sensitive_query_values(self):
        redacted = redact_sensitive_url(
            "https://api.example.com/items?token=abc123&name=fuseprobe&api_key=secret"
        )

        self.assertIn("token=%2A%2A%2A", redacted)
        self.assertIn("api_key=%2A%2A%2A", redacted)
        self.assertIn("name=fuseprobe", redacted)

    def test_keeps_plain_urls_unchanged(self):
        url = "https://api.example.com/items/1"
        self.assertEqual(redact_sensitive_url(url), url)


class TestHeaderParsing(unittest.TestCase):
    """Tests for header parsing."""
    
    def test_parse_headers(self):
        """Test parsing headers from text."""
        headers_text = "Content-Type: application/json\nAuthorization: Bearer token123"
        result = parse_headers(headers_text)
        
        self.assertEqual(result["Content-Type"], "application/json")
        self.assertEqual(result["Authorization"], "Bearer token123")
    
    def test_parse_empty_headers(self):
        """Test empty headers return empty dict."""
        self.assertEqual(parse_headers(""), {})
        self.assertEqual(parse_headers(None), {})
        self.assertEqual(parse_headers("   "), {})


class TestContentTypes(unittest.TestCase):
    """Tests for JSON media type detection."""

    def test_detects_standard_json(self):
        self.assertTrue(is_json_content_type("application/json"))
        self.assertTrue(is_json_content_type("application/json; charset=utf-8"))

    def test_detects_json_suffix_types(self):
        self.assertTrue(is_json_content_type("application/problem+json"))
        self.assertTrue(is_json_content_type("application/hal+json; charset=utf-8"))

    def test_rejects_non_json_types(self):
        self.assertFalse(is_json_content_type("text/plain"))
        self.assertFalse(is_json_content_type(""))
        self.assertFalse(is_json_content_type(None))


if __name__ == "__main__":
    unittest.main(verbosity=2)
