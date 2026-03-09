# Fuseprobe

**Offline API Testing Client**

Fuseprobe is a lightweight, privacy-focused API testing tool. No cloud, no bloat, just requests.

![Python](https://img.shields.io/badge/Made%20with-Python-blue)
![License](https://img.shields.io/badge/License-PolyForm%20Noncommercial-orange)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)

![Fuseprobe Screenshot](assets/fuseprobe.png)

Source-available for noncommercial use. Commercial use requires permission.

## Features

* **Offline First:** Works without internet connection for local APIs
* **Privacy Focused:** No telemetry, no cloud, your data stays local
* **Full HTTP Support:** GET, POST, PUT, PATCH, DELETE methods
* **JSON Syntax Highlighting:** Color-coded JSON responses (keys, strings, numbers)
* **Request History:** Review and load previous requests with one click
* **Auth Presets:** Quick setup for Bearer, Basic Auth, API Key authentication
* **API Templates:** Pre-configured templates for Graph API, GitHub, HTTPBin, and more
* **Threaded Requests:** UI never freezes, even on slow connections
* **Security Focused:** Strict URL validation, no sensitive data in history

## Use Cases

### Backend Development
- Test your REST APIs during development
- Verify endpoints before frontend integration
- Debug API responses with pretty-printed JSON

### Learning & Education
- Explore public APIs without installing Postman
- Perfect for coding bootcamps and tutorials
- Understand HTTP methods and responses

### API Debugging
- Quick requests without browser DevTools
- Save custom headers for authenticated endpoints
- Test local development servers

## Requirements

* Python 3.8+
* Dependencies: `customtkinter`, `requests`

## Installation

```bash
# Clone repository
git clone https://github.com/goAuD/Fuseprobe.git
cd Fuseprobe

# Install dependencies
pip install -r requirements.txt

# Run
python main.py
```

On Windows, prefer `python main.py` if `py` points to a different interpreter than the one where you installed dependencies.

## Usage

1. Select HTTP method (GET, POST, PUT, PATCH, DELETE)
2. Enter API URL
3. (Optional) Add request body JSON in "Request Body" tab
4. (Optional) Add custom headers in "Headers" tab
5. (Optional) Use "Presets" tab for quick auth setup or API templates
6. Click **SEND** or press **Enter**

### Presets Tab

The Presets tab provides quick access to:

**Auth Presets:**
| Preset | Description |
|--------|-------------|
| No Auth | No authentication |
| Bearer Token | JWT / OAuth2 tokens |
| Basic Auth | Base64 username:password |
| API Key (Header) | X-Api-Key header |
| API Key (Authorization) | Authorization header |

**API Templates:**
| Template | Base URL |
|----------|----------|
| Localhost | `http://localhost:8080` |
| Microsoft Graph API | `https://graph.microsoft.com/v1.0` |
| GitHub API | `https://api.github.com` |
| JSONPlaceholder | `https://jsonplaceholder.typicode.com` |
| HTTPBin | `https://httpbin.org` |
| ReqRes | `https://reqres.in/api` |

## Project Structure

```
Fuseprobe/
├── assets/
│   ├── fuseprobe.png         # App screenshot
│   └── fuseprobe_social.png  # Social preview image
├── docs/
│   └── release-v2.1.0.md     # Public release notes
├── main.py              # Entry point
├── version.py           # Version definition
├── fuseprobe_theme.py   # Fuseprobe theme module
├── COMMERCIAL-USE.md    # Commercial licensing note
├── requirements.txt     # Dependencies
├── src/
│   ├── __init__.py
│   ├── logic.py         # Business logic (API, validation)
│   ├── presets.py       # Auth presets & API templates
│   └── ui.py            # CustomTkinter UI
└── tests/
    ├── __init__.py
    └── test_logic.py    # Unit tests
```

## Data Storage

Request history is stored in your user config directory:
- **Windows:** `%USERPROFILE%\.fuseprobe\history.json`
- **Linux/macOS:** `~/.fuseprobe/history.json`

Fuseprobe also reads legacy NanoMan history from `.nanoman/history.json` if present, so older request history is carried forward automatically.

**Security:** Only method, URL, status code, and timing are saved. Headers and request body are never persisted to prevent leaking sensitive data.

## Security

| Threat | Prevention |
|--------|------------|
| XSS via URL | Only `http://` and `https://` allowed |
| JavaScript injection | `javascript:` URLs rejected |
| File access | `file://` URLs rejected |
| Credential leaks | Headers/body not saved to history |
| Request hanging | 10 second timeout |
| UI freeze | Threaded requests |

## Troubleshooting

### "Invalid or unsafe URL" error
- Make sure URL starts with `http://` or `https://`
- Check for typos in the URL
- Ensure no spaces in the URL

### Request times out
- Check if the server is running
- Try increasing timeout (edit `logic.py`, line 109)
- Verify network connection

### JSON not formatted
- Response must use a JSON media type such as `application/json` or `application/problem+json`
- Very large formatted responses fall back to plain view after 1000 lines to keep the UI responsive
- If plain text, it will display as-is

### Connection refused
- Server might not be running
- Check port number is correct
- Firewall might be blocking

## Running Tests

```bash
python -m pytest tests/ -v
```

## License

Current branch and future versions are licensed under PolyForm Noncommercial 1.0.0.

`v2.1.0` and earlier released tags remain under their original MIT license terms.

See `COMMERCIAL-USE.md` for the commercial-use note.

For commercial licensing or exceptions, open a GitHub issue.

