# Fuseprobe Hardening and Architecture Roadmap

Date: 2026-03-10

## Purpose

Define the next development phases for Fuseprobe with the correct order of work:

1. hardening and security boundaries
2. breaking down the current god class
3. expanding high-level tests
4. cleanup and stability work
5. later UI/UX refinement and feature additions

This roadmap is intentionally backend-first. Fuseprobe is already usable, but the current architecture puts request policy, persistence, rendering decisions, and widget orchestration too close together. That makes security changes riskier than they should be and slows future iteration.

## Product Direction

Fuseprobe should continue to be:

- offline-first by default
- privacy-first by design
- fast and predictable on local and internal APIs
- small and focused instead of becoming a bloated Postman clone

The next work should improve safety, maintainability, and responsiveness before adding more visible features.

## Design Reference

A tracked UI direction mockup now exists at `docs/plans/2026-03-10-ui-direction-mockup.html`.

This is a reference artifact for the later UI/UX refinement sprint, not an implementation contract. Its main value is preserving a concrete visual direction so the later P3 work does not restart from a blank slate.

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
- Removed the old unused `send_api_request(...)` path from `src/logic.py`
- Expanded the automated test suite with high-level request, history, redaction, and formatter coverage
- Started reducing `src/ui.py` request-result complexity with smaller status/render helpers
- Added service injection points for the app constructor to make UI smoke tests safe and isolated
- Added thin UI smoke tests for startup, history clear, and success-result history updates

### Current P1 State

The first architecture split is now in place. Request policy, history persistence, and response classification are no longer primarily UI-driven, and the request lifecycle now has explicit safeguards for redirects, large payloads, binary bodies, malformed history files, and stale async callbacks.

`src/ui.py` is still a large file, but the remaining size is now much more about widget construction and interaction wiring than about request policy or persistence policy. That is an acceptable stopping point for P1.

### P1 Close-Out

P1 can now be considered complete.

Reason:

- the request path is service-driven rather than UI-driven
- history persistence is isolated and hardened
- large and hostile responses have protective limits
- sensitive URL material is redacted across history and request-error paths
- malformed history state no longer threatens startup stability
- high-level regression coverage now protects the critical request/history workflows

The next active workstream should move to P2: cleanup, stability, and performance.

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

### P3: UI/UX Refinement

Only after P1 and the critical part of P2:

- smaller and cleaner global button sizing
- clearer menu logic and less ambiguity in presets/history flows
- a help menu and short in-app guidance
- better history management affordances
- general polish toward a more elegant, less noisy desktop UX

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
