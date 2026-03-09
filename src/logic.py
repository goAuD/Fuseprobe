"""
Fuseprobe - Logic Module
Business logic for API testing, URL validation, and request handling.

Security Focus:
- Only HTTP/HTTPS URLs allowed (prevents XSS, javascript: exploits)
- Strict URL validation with regex
- Request timeout to prevent hanging
- Proper JSON parsing with error handling
"""

import json
import ipaddress
import logging
from urllib.parse import urlsplit
from typing import Optional, Dict, Any

import requests

logger = logging.getLogger(__name__)


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
    
    for line in headers_text.strip().split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            headers[key.strip()] = value.strip()
    
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


def send_api_request(
    method: str, 
    url: str, 
    payload: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: int = 10
) -> Dict[str, Any]:
    """
    Send an API request and return the result.
    
    Args:
        method: HTTP method (GET, POST, PUT, DELETE, PATCH)
        url: Target URL
        payload: JSON payload for POST/PUT/PATCH
        headers: Optional request headers
        timeout: Request timeout in seconds
        
    Returns:
        Dictionary with response data or error information
    """
    # Security: Validate URL first
    if not validate_url(url):
        logger.warning(f"Invalid URL rejected: {url[:50]}...")
        return {
            "success": False,
            "error": "Invalid or unsafe URL. Only http:// and https:// are allowed."
        }
    
    # Parse JSON payload if provided
    json_data = None
    if payload and payload.strip():
        try:
            json_data = json.loads(payload)
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Invalid JSON in request body: {str(e)}"
            }
    
    # Send request
    try:
        response = requests.request(
            method=method.upper(),
            url=url,
            json=json_data,
            headers=headers or {},
            timeout=timeout
        )
        
        # Determine if response is JSON
        content_type = response.headers.get("Content-Type", "")
        is_json = is_json_content_type(content_type)
        
        # Format response body
        body = response.text
        if is_json:
            body = format_json(body)
        
        return {
            "success": True,
            "status_code": response.status_code,
            "reason": response.reason,
            "elapsed_seconds": response.elapsed.total_seconds(),
            "headers": dict(response.headers),
            "body": body,
            "is_json": is_json
        }
        
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "error": f"Request timed out after {timeout} seconds"
        }
    except requests.exceptions.ConnectionError as e:
        return {
            "success": False,
            "error": f"Connection failed: {str(e)}"
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Request failed: {str(e)}"
        }
