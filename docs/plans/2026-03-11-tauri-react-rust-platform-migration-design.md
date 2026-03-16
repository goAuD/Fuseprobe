# Fuseprobe Tauri/React/Rust Platform Migration Design

Date: 2026-03-11
Status: Approved design baseline, MVP cut-over complete, post-cut-over distribution design approved

## Canonical Role

This is the canonical architecture and scope document for the Fuseprobe platform migration.

Use this file for:

- target architecture
- product constraints
- migration phases
- MVP feature scope
- UI direction

Do not duplicate those decisions in the roadmap or the implementation plan. Those documents should reference this file.

## Purpose

Define the next major product direction for Fuseprobe after P1 and P2:

- keep the app offline-first and privacy-first
- move away from the current Tkinter UI shell
- adopt a modern, cross-platform desktop stack
- preserve the stable request, history, and safety behavior already implemented
- avoid a risky "rewrite everything at once" migration

This document is the design baseline for the next phase of work. It does not start implementation by itself.

## Implementation Status

Implementation is now underway.

Completed so far:

- Rust workspace and `fuseprobe-core` crate scaffold
- Tauri + React/Vite desktop shell scaffold
- Rust validation, redaction, history, formatting, and request-policy baseline modules
- typed Tauri command bridge contracts
- first interactive workbench shell with request, response, presets, and local-history surfaces
- real Tauri request execution now calls the Rust core instead of echoing stub payloads
- history delete and clear actions now exist in the new shell through the Tauri bridge
- response headers and raw response tabs now render real desktop response data
- template chips now apply method, URL, and auth preset defaults into the desktop request workbench
- desktop history now loads from persistent Rust-backed storage and saves back to the current Fuseprobe history path
- release-gate verification is now explicitly covered for redirect policy, history redaction, binary fallback, and formatted JSON response rendering
- persisted desktop security settings now exist across the Rust core, Tauri commands, and React hook layer with safe defaults
- fail-open desktop bridge behavior has been removed so request and history actions now surface real bridge errors instead of fabricating success
- local, private, link-local, and metadata targets are now blocked by default in the Rust request path unless the persisted unsafe-mode setting is enabled
- history persistence is now opt-in in the desktop state layer, and persisted URLs now strip fragments and redact every query value before disk storage
- desktop persistence now resolves through the OS config directory, carries legacy migration fallbacks explicitly, and surfaces non-fatal persistence warnings back into the React shell instead of hiding them
- the shipped desktop shell now has an explicit custom-command allowlist and a non-null production CSP instead of the earlier `core:default` capability and disabled CSP shortcut
- the Rust request path now rejects oversized request bodies and header blocks before parsing or network execution, and the desktop shell now enforces single-flight request execution with disabled send controls during active work
- the desktop shell now exposes explicit security toggles for unsafe targets and history persistence, both guarded by confirmation and backed by user-facing security documentation
- the Windows packaging gate has been exercised successfully with a real `tauri build`, producing a release-candidate desktop executable from the hardened shell
- the desktop shell now has real `en / de / hu` UI string switching, reusable dropdown controls, dismissible non-blocking notice banners, and an accessible custom confirmation modal instead of the earlier decorative selector and centered overlay alerts
- the `v3.0.0` cut-over is now reflected in public docs and release notes
- the legacy Python/Tkinter shell has been removed from the mainline repository after the packaging gate cleared

Still pending before MVP parity:

- no remaining feature-level parity gaps
- no remaining release-gate verification gaps for the MVP baseline

The next active work is no longer feature parity. The post-MVP security hardening gate is closed, the packaging gate has been exercised for the current Windows release-candidate path, and the legacy-shell cut-over is complete. The next work moves to post-cut-over product iteration tracked in:

- `docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md`

The next approved post-cut-over priority is:

- release/distribution hardening so public users install a real Windows release artifact instead of cloning and building the repository

The next approved functional slice after that is:

- finish the desktop localization path so the existing `en / de / hu` selector is backed by complete production-ready translations

## Decision

Fuseprobe should move to:

- `desktop shell`: Tauri
- `frontend`: React + Vite
- `core`: Rust library/crate

The Tkinter app served as the migration reference implementation. The mainline repository is now centered on the Tauri shell.

## Why This Direction

### Why not stay on Tkinter

Tkinter has been good enough to get Fuseprobe into a stable, useful state, but it is now a constraint:

- desktop UI layout and interaction patterns are harder to modernize cleanly
- visual polish and component flexibility are limited
- future UX work would consume increasing effort for smaller gains

The problem is no longer basic functionality. The problem is long-term product shape and maintainable UI evolution.

### Why Tauri + React/Vite + Rust

This stack fits Fuseprobe's product thesis well:

- fully local desktop execution
- no cloud dependency
- strong cross-platform packaging story
- modern UI freedom without Electron-scale heaviness
- a natural path toward a reusable core for a future CLI

Rust is the recommended backend/core language here because it is the native fit for Tauri and keeps packaging, performance, and offline deployment simple.

### Why not Java

Java would be heavier than this product needs and does not align naturally with the chosen desktop shell.

### Why not Python sidecar as the main direction

A Python sidecar could make the first migration step feel easier, but it would introduce a second runtime and defer the real cleanup. That can be justified only as a temporary bridge, not as the long-term architecture.

## Product Constraints

The migration must preserve these product constraints:

- offline-first by default
- privacy-first by design
- no cloud dependency for normal operation
- predictable local performance
- small-tool mentality rather than "mini Postman platform"

Post-cut-over distribution constraints:

- end users should not need Rust, npm, MSVC, or SDK setup just to run Fuseprobe
- source builds remain a developer workflow, not the primary public installation path
- release notes and README should treat downloadable installer assets as the canonical Windows delivery path

Additional direction confirmed during design:

- cross-platform packaging is a goal from the beginning
- a future CLI is desirable, but not part of the first migration release
- the CLI should later reuse the same Rust core rather than become a separate implementation
- the public repository should remain source-only rather than shipping built binaries in git
- the end-user "double-click and launch" path should come from GitHub Release assets, not source-build instructions
- the first automated publish target should be Windows only, while keeping the workflow structure ready for future Linux/macOS expansion

Additional security direction confirmed after the MVP parity pass:

- local, private, link-local, and metadata targets should be blocked by default
- those targets should only be available behind an explicit persisted `Unsafe mode / Local targets` setting
- history persistence should be off by default and only enabled explicitly by the user
- both risky settings should require explicit confirmation before they are enabled
- the shipped desktop shell should fail closed rather than fabricating mock success
- the legacy Python/Tkinter shell should be removed before packaging once the Tauri shell clears the security gate
- once the release-candidate packaging path is accepted, the legacy Python/Tkinter shell should be removed to reduce attack surface

## Scope Strategy

The migration should be incremental.

Recommended strategy:

1. freeze the Tkinter app as the baseline/reference implementation
2. build a small Rust core with the existing stable behaviors
3. build a Tauri MVP shell on top of that core
4. run a parity pass against the reference app
5. only then spend heavily on polish and additional features

This avoids both the "dual-runtime forever" trap and the "big-bang rewrite" trap.

## Architecture

### Reference App

The current Python/Tkinter app becomes:

- the behavior baseline
- the parity checklist source
- the safety-regression comparison target

It should not be treated as the final UI direction.

### Target Architecture

The target architecture is:

- `frontend/app shell`
  - React + Vite
  - request workbench UI
  - history/presets/help surfaces
  - response rendering and interaction
- `desktop bridge`
  - Tauri commands/events
  - file-system access policy
  - app lifecycle and packaging
- `core`
  - Rust request execution
  - validation
  - redirect and timeout policy
  - response classification
  - history persistence
  - redaction

### Core Design Principle

The critical behaviors should live in Rust and remain UI-agnostic:

- request execution and policy
- response classification and limits
- sensitive data redaction
- history storage behavior

That makes it possible to support both the desktop shell and a future CLI with one trusted implementation.

## MVP Feature Contract

The first Tauri release does not need full feature parity.

### In Scope for MVP

- method selector
- URL input
- send action
- request body editor
- request headers editor
- auth preset/application flow
- response view
- response headers view
- raw/plain response fallback handling
- history list
- history delete and clear
- preset/template loading
- size/timeout/redirect safety behavior
- history persistence and secret redaction

### Explicitly Out of Scope for MVP

- full CLI support
- advanced workspace/project concepts
- large extra feature additions unrelated to migration
- highly polished onboarding/help systems
- speculative feature growth not already justified by the current product

## Migration Phases

### Phase 0: Baseline Freeze

Freeze the current Tkinter app as the reference implementation.

Outputs:

- stable reference behavior
- migration checklist source
- no more major UI investment in Tkinter

### Phase 1: Rust Core MVP

Rebuild the current service-layer responsibilities in Rust:

- request execution
- request validation
- redirect policy
- timeout and size limits
- content-type classification
- binary-vs-text handling
- history load/save/add/delete/clear
- sensitive data redaction

### Phase 2: Tauri Desktop MVP Shell

Build the first desktop shell with only the core workbench flow:

- send requests
- inspect responses
- inspect response headers
- use presets
- manage history

### Phase 3: Parity Pass

Compare the new shell against the current reference implementation and close the important gaps:

- edge-case request behavior
- redaction behavior
- JSON formatting/highlighting expectations
- history semantics
- preset details that matter to current usability

### Phase 4: UX and Feature Follow-On

Only after the MVP shell is stable:

- smaller, cleaner controls
- clearer navigation and menu logic
- help and guidance surfaces
- refined visual language
- eventual CLI consumer of the Rust core

### Phase 5: Security Hardening Gate Before Packaging

Before packaging and before removing the legacy shell:

- remove fail-open desktop bridge behavior
- add persisted security settings
- enforce deny-by-default local/private target policy
- make history persistence opt-in
- tighten Tauri CSP and capability scope
- add explicit warnings, confirmations, and user-facing security docs

This phase is now functionally complete for the current desktop shell baseline.

The next cut-over step is not more shell parity work. It is release readiness and legacy removal.

The canonical execution order for this phase belongs in:

- `docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md`

### Phase 6: Release Distribution Hardening

After the security gate and packaging cut-over:

- automate Windows release installer builds for tag/release events
- upload the generated NSIS setup executable as a GitHub Release asset
- keep the repository source-only
- make the public README clearly prefer installer download over source build
- keep the workflow and docs ready for later Linux/macOS expansion, but do not activate those publish targets yet

This phase exists because the public repo should not force end users into a local Rust/Tauri/MSVC build pipeline just to try the app.

## UI Direction

The recommended UI is a request workbench, not a generic admin/dashboard shell.

The preferred mental model is:

- one focused request toolbar
- one clear request editing area
- one clear response viewing area
- lightweight access to history and presets
- quiet offline/privacy affordances, not noisy badges everywhere

Reference artifacts:

- `docs/plans/2026-03-10-ui-direction-mockup.html`
- `docs/plans/2026-03-11-ui-direction-mockup-react.html`
- `docs/plans/2026-03-11-tauri-workbench-direction-mockup.html`

The third artifact is the preferred direction for the first Tauri shell.

## Testing and Verification

The migration should preserve the existing engineering loop:

- document first
- implement in small slices
- update docs after each meaningful slice
- add or adjust tests with each slice
- keep regression verification green before continuing

Expected test layers:

- Rust unit tests for policy and formatting logic
- Rust integration tests for request/history behavior
- frontend component tests for critical UI states
- end-to-end smoke tests for the desktop shell
- parity checks against the reference behavior where practical

## Risks and Mitigations

### Risk: learning Rust while migrating product architecture

Mitigation:

- keep the first Rust scope intentionally thin
- avoid ambitious abstractions in the first iteration
- prefer readable and boring architecture over cleverness

### Risk: losing currently stable features

Mitigation:

- keep the Tkinter app as a reference
- define an explicit parity pass
- keep feature scope narrow during the MVP phase

### Risk: over-designing the new UI shell

Mitigation:

- treat the first Tauri release as an MVP workbench
- avoid turning Fuseprobe into a broad dashboard product

### Risk: public users are pushed into source builds

Mitigation:

- treat GitHub Release installer assets as the canonical public install path
- keep source-build instructions explicitly developer-oriented
- automate Windows release packaging before widening public usage expectations

### Risk: localization remains half-finished in a shipped shell

Mitigation:

- track localization as the first post-distribution functional slice
- keep `en / de / hu` as the supported locale set
- finish the production string layer rather than treating the selector as cosmetic UI

## Next Step

After review of this design document, the next document should be a concrete implementation plan for the migration MVP.
