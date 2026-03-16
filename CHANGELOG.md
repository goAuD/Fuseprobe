# Changelog

All notable changes to Fuseprobe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Repository-owned CodeQL workflow with Node 24-compatible GitHub Actions versions for JavaScript/TypeScript and Rust analysis
- Windows NSIS bundle configuration for the desktop shell with installer-managed WebView2 bootstrap support

### Changed
- Repo-owned CodeQL workflow now uses the Rust-supported `build-mode: none` path and a distinct workflow name to reduce confusion with GitHub default setup
- README now documents the NSIS setup executable as the intended Windows distribution artifact instead of the raw `target/release` binary
- README now documents the required Windows MSVC/SDK build prerequisites for source builds of the Tauri desktop shell
- README now explicitly calls out WebView2 as part of the Windows desktop runtime/build context for the Tauri shell

---

## [3.0.1] - 2026-03-14

### Fixed
- Windows release builds no longer open an extra console window alongside the desktop app

---

## [3.0.0] - 2026-03-14

### Added
- Tauri + React/Vite desktop shell scaffold under `apps/desktop`
- Rust workspace and `fuseprobe-core` migration baseline for validation, redaction, history, formatting, and request policy
- desktop workbench MVP shell with typed request state, response mock flow, preset catalog, and local-history hook
- Tauri MVP parity checklist and desktop integration coverage for the migration work
- real Rust-backed request execution from the Tauri desktop command, replacing the earlier echo stub
- history delete and clear actions in the new desktop shell, backed by the Tauri bridge
- real response headers and raw response tabs in the new desktop shell
- preset application flow in the new desktop shell, including template-driven method, URL, and auth-header defaults
- persistent Rust-backed desktop history state in the new shell, replacing the earlier seeded fallback rows
- explicit release-gate regression coverage for redirect handling, history redaction, binary fallback, and formatted JSON response rendering in the Tauri MVP
- persisted desktop security settings baseline with safe defaults across the Rust core, Tauri command layer, and React hook state
- fail-closed desktop bridge behavior for request and history actions, replacing the earlier silent mock/empty fallbacks
- deny-by-default blocking for local/private/link-local/metadata targets in the Rust request path, with persisted unsafe-mode wiring in the desktop command layer
- opt-in desktop history persistence with session-only history by default, plus stricter persisted URL redaction that strips fragments and masks all query values
- hardened desktop persistence path resolution under the OS config directory, with explicit legacy migration fallbacks and surfaced non-fatal persistence warnings in the React shell
- hardened the Tauri trust boundary with a non-null production CSP, explicit desktop command allowlisting, and removal of the broad `core:default` capability shortcut
- enforced request body/header input ceilings in the Rust core and added single-flight desktop request backpressure so overlapping sends are rejected deterministically
- desktop security controls for `Unsafe mode / Local targets` and `History persistence`, with explicit confirmation and in-app warning affordances
- public usage and security guidance in `docs/usage-and-security.md`
- explicit Tauri packaging scripts for the canonical desktop shell and verified Windows release-candidate build output
- temporary ASCII/SVG desktop brand mark wired for both the topbar and browser-tab favicon until the final logo asset is ready
- locale-backed desktop shell strings for English, German, and Hungarian, including a now-functional language selector in the Tauri workbench
- public `v3.0.0` release notes under `docs/releases/release-v3.0.0.md`

### Changed
- License changed from MIT to PolyForm Noncommercial 1.0.0 for post-`v2.1.0` development
- README now states the project is source-available for noncommercial use and points commercial exceptions to GitHub issues
- Tauri migration design status now reflects active implementation instead of design-only planning
- the desktop shell now documents security-first defaults explicitly instead of treating them as implicit behavior
- README and planning docs now treat the Tauri shell as the canonical desktop app, while the Python shell is documented as temporary legacy reference only
- the desktop shell UI now uses reusable dropdown controls, an accessible confirmation modal, and dismissible non-blocking notice banners instead of the earlier decorative locale selector and centered overlay alerts
- the mainline repository now ships a single canonical desktop shell instead of split Python and Tauri desktop paths
- the desktop response view again renders formatted JSON with brand-aware syntax coloring instead of plain monocolor text
- the default public template catalog no longer ships a blocked `Localhost` template and now starts with Open-Meteo as a usable public endpoint

### Fixed
- local-target connect failures now explain that the destination was allowed but no local service answered, reducing confusion with policy blocks

### Removed
- Legacy Python/Tkinter desktop shell files, tests, and dependency entry points from the mainline repository

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
