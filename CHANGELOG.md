# Changelog

All notable changes to Fuseprobe will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [4.0.0] - 2026-08-25

`4.0.0` is a licensing and project-infrastructure release. The application code
is unchanged: no request-path behaviour, no security defaults, no UI copy.

### Changed
- **license changed from PolyForm Noncommercial 1.0.0 to Apache License 2.0.** Fuseprobe is now open source rather than source-available, and commercial use no longer requires permission. Apache 2.0 was chosen over MIT for its explicit patent grant and its withholding of trademark rights, which keeps the Fuseprobe name protected while the code is free
- `README` badge, summary line and license section rewritten to match
- Dependabot now applies a 7-day `cooldown` on all three ecosystems, so a freshly published version is not proposed the day it appears, which is the window in which a compromised release is most likely to slip through

### Added
- `NOTICE`, recording copyright and the terms each earlier release line shipped under
- `SECURITY.md`, giving the public repository a private vulnerability disclosure path for the first time
- public landing page at https://goaud.github.io/Fuseprobe/, served from `site/` and deployed by a new `Deploy Pages` workflow
- `.github/workflows/semgrep.yml`, which runs `semgrep ci` with the existing `SEMGREP_APP_TOKEN` and uploads SARIF, so findings appear in the repository Security tab next to CodeQL rather than only on semgrep.dev
- `scripts/capture_window.py`, which captures a window through `PrintWindow` with `PW_RENDERFULLCONTENT` instead of a screen grabber, and reports the darkest channel values so a washed-out capture is caught before it ships
- `apps/desktop/e2e/site.layout.spec.ts`, fourteen Playwright assertions guarding the landing page against the CSS cascade regressions that reached it twice

### Fixed
- landing page hero and screenshot no longer run edge to edge on mobile. `.hero` and `.shot` set the `padding` shorthand while also carrying `.wrap`, which zeroed the horizontal padding that keeps content off the screen edge
- landing page respects iOS safe areas, so the header extends behind the status bar while its contents stay clear of it, and the footer clears the home indicator
- landing page tap targets outside running prose now meet the 24px WCAG 2.5.8 minimum; footer and navigation links were 20px
- landing page holds a 320px layout floor instead of compressing without limit, which also required capping three `auto-fit` grid tracks with `min(<size>, 100%)`

### Security
- all 19 open Dependabot alerts resolved by a lockfile refresh with no manifest change, since every flagged package was transitive: `quinn-proto` 0.11.14 to 0.11.17, `rustls-webpki` 0.103.12 to 0.103.15, `serde_with` 3.17.0 to 3.22.0, `undici` 7.25.0 to 7.29.0, `postcss` 8.5.15 to 8.5.26, `nanoid` 3.3.15 to 3.3.18
- all three semgrep findings resolved (`dependabot-missing-cooldown`, CWE-829 / OWASP A08)
- `tauri` 2.10.3 to 2.11.5, `vite` 8.0.16 to 8.2.2, plus the weekly Dependabot batches for `jsdom`, `typescript`, `@testing-library/jest-dom` and the pinned GitHub Actions

### Note
- relicensing is not retroactive: `v2.1.0` and earlier remain MIT, and `v3.0.0` through `v3.0.5` remain PolyForm Noncommercial 1.0.0
- the Windows installer remains unsigned, so SmartScreen may still warn about an unknown publisher

---

## [3.0.5] - 2026-04-20

### Fixed
- request panel body and headers textareas are no longer collapsed in the default desktop window, and their `resize: vertical` grip enlarges the editor again instead of being overridden by the surrounding flex layout

### Added
- Playwright end-to-end suite (`apps/desktop/e2e/workbench.layout.spec.ts`) running against the production Vite preview at three viewports (1400×900, 1280×720, 1024×700), covering textarea sizing, horizontal-overflow guards, and explicit-height retention
- dedicated `Frontend E2E` CI job that installs Chromium via `playwright install --with-deps` and uploads the Playwright report artifact on failure

### Changed
- `apps/desktop` frontend dependencies bumped via the Dependabot weekly batch: `react` / `react-dom` `19.2.4 → 19.2.5`, `@vitejs/plugin-react` `6.0.0 → 6.0.1`, `jsdom` `28.1.0 → 29.0.2`, `typescript` `5.9.3 → 6.0.3`, `vitest` `4.1.0 → 4.1.4`
- CI and release workflow GitHub Actions bumped via the Dependabot weekly batch: `actions/checkout` `5.0.1 → 6.0.2`, `actions/setup-node` `4.4.0 → 6.3.0`, `actions/upload-artifact` `4.6.2 → 7.0.1`
- public `v3.0.5` release notes live under `docs/releases/release-v3.0.5.md`

---

## [3.0.4] - 2026-04-16

### Changed
- Dependabot config rewritten as a valid `version: 2` multi-ecosystem setup covering `cargo`, `npm` (desktop), and `github-actions` under a single weekly batch
- CI and release workflows now pin every third-party GitHub Action by full commit SHA instead of a floating `@v*` ref
- CI and release workflows now bootstrap the Rust toolchain via a direct `rustup toolchain install stable --profile minimal` step instead of the third-party `dtolnay/rust-toolchain` action
- release workflow now creates the GitHub Release and uploads the Windows installer + checksum assets via the preinstalled `gh release` CLI instead of the third-party `softprops/action-gh-release` action
- public `v3.0.4` release notes live under `docs/releases/release-v3.0.4.md`

### Security
- Cargo dependency tree bumped to clear Dependabot security alerts: `rand 0.9.2 → 0.9.3` and `rustls-webpki 0.103.10 → 0.103.12`
- removed the last two third-party actions from the tag-triggered Windows installer build path so the release workflow no longer depends on an external action allow-list entry

### Fixed
- the tag-triggered `Release Desktop` workflow now runs end-to-end again after the previous run was blocked at startup by the repo's `allowed_actions: selected` policy on `dtolnay/rust-toolchain` and `softprops/action-gh-release`

---

## [3.0.3] - 2026-03-23

### Added
- release workflow now publishes companion SHA-256 checksum files next to tagged Windows installer assets

### Changed
- desktop CSP no longer allows inline styles
- release workflow now scopes `contents: write` to the Windows release job and pins third-party GitHub Actions by commit SHA
- desktop request errors now distinguish validation-time host resolution failures from generic runtime connection failures
- desktop shell visuals now use calmer text/syntax tones and a denser first-screen layout with improved viewport fit
- README screenshot and Windows release docs now reflect the current polished desktop shell
- public `v3.0.3` release notes live under `docs/releases/release-v3.0.3.md`

### Fixed
- hostname resolution failures during unsafe-target validation no longer bypass the request target policy
- settings and history persistence no longer delete the destination file before the temp-file rename step
- desktop request and history panels now fit more cleanly into the first viewport without the earlier overly bright contrast

---

## [3.0.2] - 2026-03-17

### Added
- Repository-owned CodeQL workflow with Node 24-compatible GitHub Actions versions for JavaScript/TypeScript and Rust analysis
- Windows NSIS bundle configuration for the desktop shell with installer-managed WebView2 bootstrap support
- Windows release workflow that publishes the NSIS setup executable as a GitHub release asset on version tags
- persisted desktop locale selection across restarts
- stable-key localization for auth presets and API templates instead of English-first display-key lookups
- structured desktop request metadata and structured Tauri error/warning codes so response/policy/warning rendering is localized on the frontend
- public `v3.0.2` release notes under `docs/releases/release-v3.0.2.md`

### Changed
- Repo-owned CodeQL workflow now uses the Rust-supported `build-mode: none` path and a distinct workflow name to reduce confusion with GitHub default setup
- README now documents the NSIS setup executable as the intended Windows distribution artifact instead of the raw `target/release` binary
- README now documents the required Windows MSVC/SDK build prerequisites for source builds of the Tauri desktop shell
- README now explicitly calls out WebView2 as part of the Windows desktop runtime/build context for the Tauri shell
- README now documents that Windows source builds may need a Visual Studio developer shell so `cl`, `link`, `rc`, and `mt` are available on `PATH`
- README and release notes now treat GitHub release assets as the canonical Windows install path, with source builds explicitly framed as a developer workflow
- the temporary in-house `FP` badge mark now drives the desktop icon set as well as the existing navbar/favicon mark
- desktop UI copy is now production-ready across English, German, and Hungarian for notices, history/settings flows, auth/template presentation, and response metadata
- locale choice now persists locally instead of resetting to English on restart
- the desktop response/history/settings contract now prefers machine-readable metadata over backend-owned English UI prose

### Fixed
- unsafe-target validation now also blocks `localhost`-style alias domains and domains that resolve to loopback/private addresses while `Unsafe mode / Local targets` is off
- the active desktop storage path no longer depends on the old `.nanoman` fallback directory

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
