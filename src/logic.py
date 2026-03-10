"""
Fuseprobe - Logic Module
Business logic for URL validation, redaction, and lightweight text helpers.

Security Focus:
- Only HTTP/HTTPS URLs allowed (prevents XSS, javascript: exploits)
- Sensitive query values can be redacted before logging or persistence
- Proper JSON parsing helpers for text rendering
"""

import json
import ipaddress
import logging
import re
from typing import Dict
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

logger = logging.getLogger(__name__)

SENSITIVE_QUERY_KEYS = {
    "access_token",
    "api_key",
    "apikey",
    "auth",
    "client_secret",
    "key",
    "password",
    "secret",
    "signature",
    "token",
}

HEADER_NAME_PATTERN = re.compile(r"^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$")


def redact_sensitive_url(url: str) -> str:
    """Redact sensitive query parameter values for logs and persisted history."""
    if not url or not isinstance(url, str):
        return url

    try:
        parsed = urlsplit(url)
    except ValueError:
        return url

    if not parsed.query:
        return url

    redacted_pairs = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        if key.lower() in SENSITIVE_QUERY_KEYS:
            redacted_pairs.append((key, "***"))
        else:
            redacted_pairs.append((key, value))

    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urlencode(redacted_pairs, doseq=True),
            parsed.fragment,
        )
    )


def validate_url(url: str) -> bool:
    """
    Validate that URL is safe and properly formatted.
    Only HTTP and HTTPS protocols are allowed.
    
    Security: Prevents XSS via javascript:, ftp:, file:, data: URLs
    
    Note: Allows intranet hostnames without TLD (e.g., http://intranet/api)
    
    Args:
        url: The URL to validate
        
    Returns:
        True if URL is valid and safe, False otherwise
    """
    if not url or not isinstance(url, str):
        return False
    
    url = url.strip()

    if any(char.isspace() for char in url):
        return False

    try:
        parsed = urlsplit(url)
    except ValueError:
        return False

    if parsed.scheme.lower() not in {"http", "https"}:
        return False

    if not parsed.netloc or not parsed.hostname:
        return False

    if parsed.username is not None or parsed.password is not None:
        return False

    try:
        parsed.port
    except ValueError:
        return False

    host = parsed.hostname
    if host.lower() == "localhost":
        return True

    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        pass

    labels = host.split(".")
    if any(not label for label in labels):
        return False

    for label in labels:
        if len(label) > 63:
            return False
        if label.startswith("-") or label.endswith("-"):
            return False
        if not label.replace("-", "").isalnum():
            return False

    return True


def format_json(text: str) -> str:
    """
    Format JSON string with pretty printing.
    
    Args:
        text: Raw JSON string
        
    Returns:
        Formatted JSON string, or original text if parsing fails
    """
    if not text:
        return text
    
    try:
        parsed = json.loads(text)
        return json.dumps(parsed, indent=4, ensure_ascii=False)
    except (json.JSONDecodeError, TypeError):
        return text


def parse_headers(headers_text: str) -> Dict[str, str]:
    """
    Parse headers from text format (key: value per line).
    
    Args:
        headers_text: Headers in text format
        
    Returns:
        Dictionary of headers
    """
    headers = {}
    if not headers_text or not headers_text.strip():
        return headers

    for line_number, raw_line in enumerate(headers_text.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue

        if ":" not in line:
            raise ValueError(f"Invalid header on line {line_number}: expected 'Name: Value'")

        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()

        if not key:
            raise ValueError(f"Invalid header on line {line_number}: header name cannot be empty")

        if not HEADER_NAME_PATTERN.fullmatch(key):
            raise ValueError(f"Invalid header on line {line_number}: unsupported header name '{key}'")

        if any(char in value for char in ("\r", "\n", "\0")):
            raise ValueError(f"Invalid header on line {line_number}: header value contains control characters")

        headers[key] = value

    return headers


def is_json_content_type(content_type: str) -> bool:
    """
    Return True for JSON and JSON-based media types.

    Examples:
    - application/json
    - application/problem+json
    - application/hal+json
    """
    if not content_type:
        return False

    mime_type = content_type.split(";", 1)[0].strip().lower()
    return mime_type == "application/json" or mime_type.endswith("+json")
