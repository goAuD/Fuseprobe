# Fuseprobe Hardening and Architecture Roadmap

Date: 2026-03-10

## Purpose

Define the next development phases for Fuseprobe with the correct order of work:

1. hardening and security boundaries
2. breaking down the current god class
3. expanding high-level tests
4. cleanup and stability work
5. later platform migration, then UI/UX refinement and feature additions

This roadmap is intentionally backend-first. Fuseprobe is already usable, but the current architecture puts request policy, persistence, rendering decisions, and widget orchestration too close together. That makes security changes riskier than they should be and slows future iteration.

## Product Direction

Fuseprobe should continue to be:

- offline-first by default
- privacy-first by design
- fast and predictable on local and internal APIs
- small and focused instead of becoming a bloated Postman clone

The next work should improve safety, maintainability, and responsiveness before adding more visible features.

## Design Reference

Tracked design references now exist at:

- `docs/plans/2026-03-10-ui-direction-mockup.html`
- `docs/plans/2026-03-11-ui-direction-mockup-react.html`
- `docs/plans/2026-03-11-tauri-workbench-direction-mockup.html`
- `docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md`

These are reference artifacts, not implementation contracts. Their role is to preserve the visual and architectural direction so the platform migration and the later UI refinement do not restart from a blank slate.

## Canonical Files

For the Tauri migration, use these files as the single sources of truth:

- Architecture and scope: `docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md`
- Implementation tasks: `docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md`

This roadmap should stay high level and should not re-specify those documents in detail.

## Progress Log

### Completed So Far

- Extracted request execution into `src/services/request_service.py`
- Extracted history persistence into `src/services/history_store.py`
- Extracted body classification and formatting into `src/services/response_formatter.py`
- Disabled automatic redirect following in the new request path
- Added streamed response reading with a size cap
- Added safe binary-response fallback handling
- Added single-item history delete and clear-all history actions
- Added URL redaction for persisted history and log-safe display
- Added request-exception redaction so sensitive URL values are not echoed back in error strings
- Rejected URLs with embedded credentials such as `user:pass@host`
- Hardened request header parsing so malformed or suspicious header lines are rejected before network execution
- Moved request-input snapshotting onto the UI thread before the worker starts, removing background reads from Tk widgets
- Hardened history normalization so malformed or manually edited history items fall back safely instead of crashing load/save paths
- Added request-id based async UI coordination so stale background results do not overwrite the current view state
- Switched the request body and header editors to safe empty defaults instead of prefilled sample payloads
- Added charset fallback decoding so invalid response charset declarations no longer crash rendering
- Removed the old unused `send_api_request(...)` path from `src/logic.py`
- Expanded the automated test suite with high-level request, history, redaction, and formatter coverage
- Started reducing `src/ui.py` request-result complexity with smaller status/render helpers
- Added service injection points for the app constructor to make UI smoke tests safe and isolated
- Added thin UI smoke tests for startup, history clear, and success-result history updates
- Started P2 by cleaning up history state handling so no-op deletes/clears no longer trigger redundant saves or misleading status messages
- Added dirty-state based history persistence so close/no-op paths can skip unnecessary writes
- Simplified the response/status render path with shared response text helpers and more consistent error status summaries
- Simplified tab switching by moving content frames behind a single mapping instead of manual per-tab branching
- Reduced avoidable UI work by configuring JSON highlight tags once and removing repeated preset-name lookups during preset rendering

### Current P1 State

The first architecture split is now in place. Request policy, history persistence, and response classification are no longer primarily UI-driven, and the request lifecycle now has explicit safeguards for redirects, large payloads, binary bodies, malformed history files, and stale async callbacks.

`src/ui.py` is still a large file, but the remaining size is now much more about widget construction and interaction wiring than about request policy or persistence policy. That is an acceptable stopping point for P1.

### P1 Close-Out

The original close-out assessment marked P1 as complete, the 2026-03-11 audit re-opened that conclusion, and the follow-up fixes below closed the remaining gaps.

Reason:

- the request path is service-driven rather than UI-driven
- history persistence is isolated and hardened
- large and hostile responses have protective limits
- sensitive URL material is redacted across history and request-error paths
- malformed history state no longer threatens startup stability
- high-level regression coverage now protects the critical request/history workflows

The next active workstream can now move to P2: cleanup, stability, and performance.

### 2026-03-11 Audit Notes

The audit confirmed that the core architecture split, hardening layers, and test scaffolding landed correctly, but it also found two remaining P1-level issues that should be fixed before P2 starts.

Audit findings:

- fresh app state still seeds the request body editor with example JSON and the headers editor with `Content-Type: application/json`, so a default first `GET` request is sent with an unexpected JSON body unless the user clears it manually
- the response formatter currently trusts any declared charset name, so a server that returns an unknown charset can still raise a `LookupError` during body decoding instead of falling back safely

Resolution:

- the request body and request header editors now start empty, with helper copy instead of implicit payloads
- the response formatter now falls back safely when a server declares an unknown charset
- both issues are covered by regression tests

Updated verdict:

- P1 is complete after the 2026-03-11 audit follow-up fixes

### P2 Close-Out

P2 can now be considered complete for the current desktop baseline.

Reason:

- history mutations and persistence are now cleaner, with fewer redundant writes and fewer misleading no-op side effects
- response rendering and status messaging are more centralized and easier to reason about
- tab/content switching is less branch-heavy and has direct smoke coverage
- a small but real amount of repeated UI work was removed from the response highlighting and preset-render paths
- the codebase remains lint-clean and the full automated verification still passes after the cleanup work

This does not mean the UI is “done”. It means the cleanup, stability, and lightweight performance pass planned for P2 has been completed well enough that the next active workstream can move away from Tkinter polish and into the new platform-migration design work.

### P3 Early Progress

The platform migration is now underway.

Completed so far:

- added the root Rust workspace and the `crates/fuseprobe-core` crate
- scaffolded the `apps/desktop` Tauri + React/Vite shell
- generated the initial Tauri icon set from the current Fuseprobe branding asset
- ported URL validation and sensitive query redaction into the Rust core with tests
- added the first Rust history-store baseline with normalization, bounds, delete, and clear behavior
- added the first Rust response-classification baseline for JSON, text, and binary detection
- added the first Rust request-policy baseline for redirect, timeout, and max-response defaults
- added the first Tauri command/TypeScript contract bridge between the desktop shell and the Rust core
- added the first React workbench shell with request, response, and history regions aligned to the approved direction mockup
- added the first interactive workbench state hook so method, URL, body, and headers now drive a typed desktop request/response flow
- added the first desktop preset catalog and history hook so the shell now renders real template data and bridge-backed local history state
- added the first desktop integration coverage and a tracked parity checklist for the Tauri MVP shell
- replaced the Tauri request stub with real Rust core execution and in-memory desktop history updates on successful sends
- added desktop history delete and clear actions in the new shell, wired through the Tauri bridge
- added real `Response / Headers / Raw` views in the new shell, backed by live desktop response data
- added preset application flow in the new shell so template chips now drive method, URL, and auth-header defaults in the request workbench
- added persistent Rust-backed desktop history loading and saving, with current `~/.fuseprobe/history.json` storage and legacy `.nanoman` fallback loading
- closed the Tauri MVP release-gate verification with explicit regression coverage for redirect policy, history redaction, binary fallback, and formatted JSON response rendering
- added persisted desktop security settings with safe defaults in the Rust core, Tauri state layer, and React hook surface
- removed fail-open desktop bridge behavior so request and history errors now surface explicitly in the React shell
- enforced deny-by-default blocking for local/private/link-local/metadata targets in the Rust request path, with unsafe-mode override wiring in the desktop command layer
- made desktop history persistence opt-in, skipped disk-history loading when disabled, and tightened persisted URL redaction to strip fragments and redact every query value

The current state is now an interactive MVP shell with a real Rust/Tauri foundation. Request flow, response views, preset application, and local-history persistence all exist in the React desktop app, and the MVP release-gate checks are now explicitly covered. The next work can move away from parity closure and into follow-on UX and product iteration.

That next work has now been narrowed further: before broader UX polish or packaging, the active workstream is a post-MVP security hardening gate for the shipped Tauri shell. The canonical task list lives in:

- `docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md`

Approved decisions for that gate:

- local, private, link-local, and metadata targets blocked by default
- explicit persisted `Unsafe mode / Local targets` opt-in for risky destinations
- history persistence off by default
- explicit confirmations for enabling risky settings
- fail-closed desktop bridge behavior
- legacy Python/Tkinter shell removed only after the hardening gate and packaging cut-over

The first implementation slice of that gate is now complete:

- persisted security settings baseline
- fail-closed desktop bridge baseline
- deny-by-default target policy baseline
- opt-in history persistence baseline
- deterministic config-dir path resolution for desktop persistence
- surfaced non-fatal persistence warnings in the Rust/Tauri/React desktop path
- non-null production CSP and narrowed Tauri desktop capability scope with explicit custom-command allowlisting
- request body/header ceiling enforcement in the Rust core and single-flight desktop request backpressure with disabled send-state UX
- explicit desktop security controls with confirmations and user-facing security guidance for the Tauri shell
- packaging-gate verification completed with a successful `tauri build` release-candidate executable on Windows

Post-gate UI hardening has also landed on the canonical desktop shell:

- real locale-backed `en / de / hu` shell strings instead of a decorative language selector
- reusable dropdown controls for request method and language selection
- accessible security confirmation modal behavior with keyboard handling and focus return
- dismissible non-blocking request/persistence notices instead of centered overlay alerts
- a general clean-code pass across the Tauri shell UI surface so the cut-over branch does not ship obvious UI debt

The next active slice is:

- release/versioning follow-through for the first fully canonical Tauri desktop release
- final logo asset replacement after the current temporary ASCII/SVG brand mark placeholder

That packaging cut-over is now complete:

- the canonical release line is now `v3.0.0`
- the legacy Python/Tkinter shell has been removed from the mainline repository
- the repo now documents and verifies a single desktop path centered on `apps/desktop/`

Post-cut-over release-readiness follow-up is now underway:

- the response view is being re-tightened so formatted JSON regains readable brand-aware syntax coloring
- the default public template list is being aligned with the security-first policy so it no longer leads with a blocked localhost target
- final logo and tabbar branding are deferred until a clean production-ready asset is available

The next active post-cut-over execution slice is now:

- public distribution hardening so GitHub Releases become the real Windows install path

That slice is complete only when:

- a Windows release workflow exists for tagged versions
- the NSIS setup executable is uploaded as a GitHub Release asset
- the README prefers release download over source build
- maintainers have a short checklist for validating the published Windows setup asset

The next functional slice after that remains:

- production localization completion for `en / de / hu`

Approved temporary branding direction for the current desktop shell:

- replace the mismatched placeholder/app icon imagery with a deterministic in-house `FP` badge mark
- use the same `FP` mark for both the navbar brand mark and the temporary desktop/app icon set
- keep the visual treatment dark, compact, badge-like, and aligned with the existing green/black Fuseprobe UI direction
- treat this as an interim asset only, not the final long-term logo system

Current status:

- the shared `FP` badge mark is already active in the navbar/favicon path
- the desktop icon set has now been regenerated from that same mark so the packaged app no longer points at the earlier mismatched placeholder imagery

## Priorities

### P1: Hardening, Architecture Split, and Test Expansion

This is the primary workstream and should be completed before major UI changes.

Goals:

- move security-relevant behavior out of the UI layer
- reduce the risk of accidental data leakage
- protect the app from large or hostile responses
- make request and persistence behavior testable without GUI coupling
- add higher-level regression coverage around the real workflows

### P2: Cleanup, Stability, and Performance

After the first architecture split is in place:

- remove dead and unused code
- normalize error handling and status messaging
- tighten naming and module responsibilities
- reduce unnecessary redraws and wasteful response processing
- improve startup and request-path consistency

### P3: Tauri/React/Rust Platform Migration

The old P3 "desktop polish" goal has been re-scoped.

The next primary workstream is now the Tauri migration described in:

- `docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md`
- `docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md`

In short:

- the Tkinter app becomes the stable reference implementation
- the new product shell moves to `Tauri + React/Vite`
- the core request/history/formatting/redaction logic moves to Rust
- the first release is an MVP shell, not a full parity rewrite

### P4: Security Hardening Gate Before Packaging

Before packaging the new shell:

- tighten the Tauri trust boundary
- add persisted security settings
- enforce local/private target policy
- make history persistence opt-in
- harden path resolution and persistence-error handling
- add user-facing security guidance

The detailed task order belongs in:

- `docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md`

This gate is now complete for the current desktop release-candidate baseline.

### P5: UI/UX Refinement and Follow-On Features

After the new platform shell exists and the MVP reaches stable feature parity on the core paths:

- smaller and cleaner global button sizing
- clearer menu logic and less ambiguity in presets/history flows
- a help menu and short in-app guidance
- better history management affordances
- general polish toward a more elegant, less noisy desktop UX
- later CLI work built on the Rust core

## Approaches Considered

### Approach A: Hardening First, Without Full Rewrite

Recommended.

- Extract request policy, history persistence, and response formatting into focused services.
- Keep the current UI mostly intact while moving non-UI responsibilities out.
- Add high-level workflow tests around the new service boundaries.

Why this is the recommendation:

- improves security and stability quickly
- avoids a risky rewrite
- creates a clean base for future UI work

### Approach B: Test Wall First, Refactor Later

- Add many tests around the current behavior before any structure changes.
- Defer the architecture split until after broader coverage exists.

Trade-off:

- safer in the short term
- keeps the god class in place longer and slows the hardening work

### Approach C: Big Architecture Rewrite First

- Redesign the app into a much stricter multi-layer architecture immediately.

Trade-off:

- cleaner on paper
- too risky and too expensive for the current stage of the project

## Approved Direction

Proceed with Approach A.

That means:

- backend-first hardening
- controlled refactor of `src/ui.py`
- high-level tests alongside the refactor
- dead code cleanup after the new boundaries exist

## Target Architecture

### Current Problem

`src/ui.py` currently owns too many responsibilities:

- widget construction
- tab switching
- request execution
- response formatting decisions
- history loading and saving
- history rendering
- preset application
- status messaging

This makes regressions more likely and forces tests to interact with UI behavior to validate non-UI logic.

### Planned First Split

Create the following service modules:

- `src/services/request_service.py`
- `src/services/history_store.py`
- `src/services/response_formatter.py`

#### `request_service.py`

Owns:

- URL and request validation entry points
- redirect policy
- timeout policy
- response size policy
- streaming and body read limits
- unified result object returned to the UI

The UI should no longer call `requests.request(...)` directly.

#### `history_store.py`

Owns:

- config directory resolution
- legacy `.nanoman` history loading
- history file loading and saving
- bounded retention policy
- delete-one and clear-all operations
- safe writes and parse-failure handling

The UI should no longer manage history persistence directly.

#### `response_formatter.py`

Owns:

- content-type classification
- JSON pretty printing
- text vs binary decisions
- large-response fallback decisions
- truncation messaging metadata

The UI should render a prepared result, not invent rendering rules.

### UI Responsibilities After P1

`src/ui.py` should remain responsible for:

- layout
- control wiring
- tab switching
- user input collection
- rendering formatted results
- rendering history entries
- displaying status updates

It should not remain the source of truth for request policy or persistence policy.

## Hardening Scope

The first hardening pass should focus on the app boundary, not on speculative enterprise security features.

### Request Boundary

- disable automatic redirect following by default
- represent redirect responses clearly instead of silently following them
- centralize timeout handling
- reject unsafe or malformed targets before request execution
- prepare for stricter internal target policy later if needed

### Response Boundary

- stream responses instead of assuming all payloads are safe to fully materialize
- introduce a maximum response-body size for in-memory rendering
- detect binary or non-text payloads and avoid beautify/highlight attempts
- preserve UI responsiveness for large bodies

### Privacy Boundary

- redact sensitive headers such as `Authorization`, `Cookie`, `X-Api-Key`, and similar patterns
- redact known secret-like query parameters in logs and history
- ensure status messages never leak sensitive material
- keep request body and headers out of persisted history

### Persistence Boundary

- keep history bounded
- support deleting a single history item
- support clearing all history
- handle corrupt history files gracefully
- write history atomically to reduce corruption risk

## Test Strategy

The project should move from narrow logic tests toward higher-level workflow tests.

### Test Types

#### Service-Level Tests

For the new services:

- request policy behavior
- response size handling
- redirect handling
- binary detection
- history persistence and retention
- redaction behavior

#### Integration-Style Tests

These should be the main addition in P1.

- mock HTTP calls at the `requests` boundary
- run realistic request flows through the service layer
- use temporary config directories for history tests
- validate returned status/result structures instead of low-level helper details

#### Light UI Smoke Tests

Keep this thin.

- app init/destroy
- basic tab switching
- request result update path sanity

The goal is not deep GUI automation in the first sprint.

### Key Regression Scenarios

Minimum must-have scenarios:

- redirect response does not silently fetch a second location
- huge response triggers safe fallback
- binary response is not JSON-formatted
- malformed history file does not crash startup
- single history delete works
- clear-all history works
- sensitive header values never persist to history
- legacy NanoMan history still loads

## Cleanup and Stability Scope

This work should begin after the first service split lands.

### Cleanup

- remove unused imports, helpers, and stale compatibility fragments
- shrink duplicated color/layout handling where possible
- normalize naming of request/result/history concepts

### Stability

- reduce side effects in UI update paths
- ensure startup state, history state, and status bar state are always synchronized
- make errors consistent and user-readable

### Performance

- avoid unnecessary full-text re-highlighting
- avoid redundant history redraws
- keep request execution and response rendering decoupled enough for later optimization

## UI/UX Follow-Up Plan

This is intentionally later work.

When P1 and the critical P2 tasks are complete, the next UI sprint should focus on:

- smaller and more elegant global buttons
- clearer presets/history/menu affordances
- more explicit history actions
- cleaner information hierarchy
- a help menu with concise guidance

The tracked mockup in `docs/plans/2026-03-10-ui-direction-mockup.html` should be used as a visual input during that sprint, then adapted to the actual desktop constraints and the hardened architecture rather than copied literally.

The UI sprint should be informed by the hardened and simplified backend structure, not happen in parallel with major architecture work.

## Non-Goals for the First Sprint

- no plugin system
- no cloud sync
- no team collaboration features
- no collection runner or scripted test suite
- no major visual redesign beyond small support changes required by the refactor

## Implementation Order

1. introduce service modules and move policy logic out of `src/ui.py`
2. add high-level tests around request, response, and history workflows
3. implement history delete and clear operations through `history_store`
4. add response streaming, size limits, and binary handling
5. normalize error/result models
6. remove dead code and simplify remaining UI responsibilities
7. begin the later UI/UX refinement sprint

## Success Criteria

The first major sprint is successful when:

- the request path is service-driven rather than UI-driven
- history persistence is isolated and testable
- large and hostile responses cannot easily freeze or bloat the app
- sensitive values do not leak into logs, status text, or persisted history
- high-level regression tests cover the critical request and history workflows
- `src/ui.py` is meaningfully smaller and easier to reason about

## Risks

### Risk: Refactor Regressions

Mitigation:

- move logic in small slices
- keep high-level tests close to the new boundaries
- avoid mixing UI redesign into the same PRs

### Risk: Overengineering

Mitigation:

- keep only three service modules in the first split
- avoid introducing framework-style abstraction for its own sake

### Risk: Performance Regressions From Safety Features

Mitigation:

- prefer measurable limits
- use streaming and truncation instead of broad blocking
- add regression tests for large payload behavior
