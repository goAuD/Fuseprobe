# Fuseprobe

**Offline API Testing Client**

Fuseprobe is a lightweight, privacy-focused API testing tool. No cloud, no bloat, just requests.

![Python](https://img.shields.io/badge/Made%20with-Python-blue)
![License](https://img.shields.io/badge/License-PolyForm%20Noncommercial-orange)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)

![Fuseprobe Screenshot](assets/fuseprobe.png)

Source-available for noncommercial use. Commercial use requires permission.

## Desktop Shell

The canonical desktop app is now the `Tauri + React/Vite + Rust` shell under `apps/desktop/`.

The older Python/Tkinter app remains in the repository only as a temporary legacy reference during the packaging cut-over. It is no longer the primary desktop direction and should be treated as a fallback baseline while the release candidate is being finalized.

## Desktop Security Defaults

The current desktop shell is intentionally strict by default:

- `Unsafe mode / Local targets` is **off** until you explicitly enable it
- local, private, link-local, and metadata-style targets are blocked by default
- `History persistence` is **off** until you explicitly enable it
- both risky settings require an explicit confirmation before they switch on

These are deliberate security design choices, not missing features.

See [docs/usage-and-security.md](docs/usage-and-security.md) for the public usage and security notes.

## Features

* **Offline First:** Works without cloud services and keeps desktop data local
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

### Canonical desktop shell

* Node.js 20+
* npm 10+
* Rust stable toolchain

### Legacy reference app

* Python 3.8+
* Dependencies: `customtkinter`, `requests`

## Installation

```bash
git clone https://github.com/goAuD/Fuseprobe.git
cd Fuseprobe
```

### Desktop development shell

```bash
npm --prefix apps/desktop install
npm --prefix apps/desktop run tauri:dev
```

### Desktop release-candidate build

```bash
npm --prefix apps/desktop run tauri:build
```

Expected Windows release artifact:

- `target/release/fuseprobe-desktop.exe`

### Legacy Python reference app

```bash
pip install -r requirements.txt
python main.py
```

On Windows, prefer `python main.py` if `py` points to a different interpreter than the one where you installed dependencies.

## Usage

1. Launch the desktop shell with `npm --prefix apps/desktop run tauri:dev`
2. Select HTTP method (GET, POST, PUT, PATCH, DELETE)
3. Enter API URL
4. (Optional) Add request body JSON in the request editor
5. (Optional) Add custom headers in the request editor
6. (Optional) Use the template chips for quick preset loading
7. Click **Send**

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
├── apps/
│   └── desktop/              # Canonical Tauri + React/Vite desktop shell
├── crates/
│   └── fuseprobe-core/       # Shared Rust request/history/security core
├── assets/
│   ├── fuseprobe.png         # App screenshot
│   └── fuseprobe_social.png  # Social preview image
├── docs/
│   ├── release-v2.1.0.md     # Public release notes
│   ├── usage-and-security.md # User-facing usage and security notes
│   └── plans/                # Architecture, migration, roadmap, packaging gate
├── main.py                   # Legacy Python reference entry point
├── version.py                # Shared version metadata
├── fuseprobe_theme.py        # Legacy Python theme module
├── COMMERCIAL-USE.md         # Commercial licensing note
├── requirements.txt          # Legacy Python dependencies
├── src/                      # Legacy Python reference implementation
└── tests/                    # Legacy Python reference tests
```

## Data Storage

Legacy Python reference app history is stored in your user config directory:
- **Windows:** `%USERPROFILE%\\.fuseprobe\\history.json`
- **Linux/macOS:** `~/.fuseprobe/history.json`

The new Tauri desktop shell keeps request history session-only by default.

If you enable `History persistence`, the desktop shell stores redacted history in the OS config directory under `Fuseprobe/history.json` and keeps security settings in `Fuseprobe/settings.json`.

The desktop shell also reads legacy Fuseprobe and NanoMan history/settings when present, so older local state can be carried forward safely.

**Security:** Only method, URL, status code, and timing are saved. Headers and request body are never persisted to prevent leaking sensitive data.

## Security

| Threat | Prevention |
|--------|------------|
| XSS via URL | Only `http://` and `https://` allowed |
| JavaScript injection | `javascript:` URLs rejected |
| File access | `file://` URLs rejected |
| Credential leaks | Headers/body not saved to history |
| Local/internal probing | Desktop shell blocks local/private targets by default |
| Accidental local persistence | Desktop shell keeps history session-only until enabled |
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
npm --prefix apps/desktop test -- --run
cargo test
```

## License

Current branch and future versions are licensed under PolyForm Noncommercial 1.0.0.

`v2.1.0` and earlier released tags remain under their original MIT license terms.

See `COMMERCIAL-USE.md` for the commercial-use note.

For commercial licensing or exceptions, open a GitHub issue.

