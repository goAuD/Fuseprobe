# Changelog

All notable changes to Fuseprobe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed
- License changed from MIT to PolyForm Noncommercial 1.0.0 for post-`v2.1.0` development
- README now states the project is source-available for noncommercial use and points commercial exceptions to GitHub issues

---

## [2.1.0] - 2026-03-09

### Added
- Public release notes for the Fuseprobe rename and UI refresh rollout
- Refreshed marketing assets in `assets/` for the public repository and GitHub social previews

### Changed
- Product renamed from NanoMan to Fuseprobe
- Branding references updated across code, docs, assets, and window chrome
- Theme module renamed to `fuseprobe_theme.py`
- History storage moved to `~/.fuseprobe/` with backward-compatible loading from the legacy `.nanoman/` directory
- Desktop UI refreshed with a black/graphite visual system, burnt-copper accents, tighter spacing, cleaner button alignment, dropdown auto-close on selection, and clearer large-JSON fallback messaging
- README and repository structure polished for public release readiness

### Fixed
- Restored persisted history rendering on startup
- Request counter now reflects loaded history immediately after launch
- URL validation now accepts query-only URLs such as `https://api.example.com?x=1`
- JSON pretty-print detection now supports `application/*+json` media types

---

## [1.2.2] - 2026-01-27

### Added
- **Presets Tab**: New dedicated tab for auth presets and API templates
- **Auth Presets**: Quick setup for Bearer Token, Basic Auth, API Key authentication
- **API Templates**: Pre-configured templates for Microsoft Graph API, GitHub API, HTTPBin, ReqRes, JSONPlaceholder, and Localhost
- **Data Storage**: History now stored in user config directory (`~/.fuseprobe/`)

### Changed
- Version management centralized in `version.py`
- Default URL removed (empty with placeholder) - aligns with offline-first philosophy
- Tab bar reorganized: main tabs (blue) + special tabs (purple)
- All tab buttons unified to 110px width with centered text
- README updated with Presets documentation and Data Storage section

### Security
- Headers and request body are never persisted to history
- History file moved out of repository to prevent accidental commits

---

## [1.2.1] - 2026-01-25

### Added
- Fuseprobe theme integration
- Color palette and fonts from `fuseprobe_theme.py`
- JSON syntax highlighting with branded colors

### Changed
- UI styling refreshed for the standalone Fuseprobe brand
- Version bump to 1.2.1

---

## [1.2.0] - 2026-01-24

### Added
- Request history persistence to `history.json`
- Load previous requests from history with one click
- Request counter in status bar

### Changed
- History tab now shows saved requests
- Performance limit for JSON highlighting (1000 lines max)

---

## [1.1.0] - 2026-01-23

### Added
- Custom headers support in dedicated Headers tab
- Request body tab for POST/PUT/PATCH payloads
- Tab-based interface for better organization

### Changed
- UI restructured with tabbed content area
- Improved error handling and status messages

---

## [1.0.0] - 2026-01-22

### Added
- Initial release
- HTTP methods: GET, POST, PUT, PATCH, DELETE
- JSON syntax highlighting for responses
- Threaded requests (non-blocking UI)
- URL validation (HTTP/HTTPS only)
- Dark theme with CustomTkinter

### Security
- Strict URL validation prevents XSS via javascript:, file:, data: URLs
- 10 second request timeout
