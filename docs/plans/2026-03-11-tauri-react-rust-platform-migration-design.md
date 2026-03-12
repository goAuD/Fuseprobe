# Fuseprobe Tauri/React/Rust Platform Migration Design

Date: 2026-03-11
Status: Approved design baseline, implementation in progress

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

Still pending before MVP parity:

- real Rust-backed request execution through the desktop shell
- real desktop history persistence and mutation actions
- auth preset application flow
- response headers/raw tabs with real data

## Decision

Fuseprobe should move to:

- `desktop shell`: Tauri
- `frontend`: React + Vite
- `core`: Rust library/crate

The current Tkinter app remains the reference implementation until the new shell is functionally credible.

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

Additional direction confirmed during design:

- cross-platform packaging is a goal from the beginning
- a future CLI is desirable, but not part of the first migration release
- the CLI should later reuse the same Rust core rather than become a separate implementation

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

## Next Step

After review of this design document, the next document should be a concrete implementation plan for the migration MVP.
