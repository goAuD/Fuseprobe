# Fuseprobe v3.0.2 Localization and Release Design

Date: 2026-03-16
Status: approved design baseline

## Purpose

Define the next release slice for Fuseprobe:

- complete production localization for `en / de / hu`
- verify the real GitHub Release asset publish path with the next tagged release
- ship both in the same release so the next public Windows build is both localized and distribution-proven

This is a release-scope design document, not the implementation task list.

## Current Context

Fuseprobe is already on the canonical `Tauri + React/Vite + Rust` stack.

Current state:

- desktop MVP, security hardening gate, and Windows packaging gate are complete
- the GitHub Actions release workflow exists in `.github/workflows/release-desktop.yml`
- the workflow has only been proven through `workflow_dispatch` on `main`
- the tag-triggered GitHub Release asset path is still unproven because existing release tags predate the workflow
- the desktop shell has a visible `en / de / hu` selector, but localization is not yet production-complete

Known localization gaps:

- locale selection resets to `en` on restart
- some user-facing strings still live outside the locale catalog
- presets and templates are still sourced from English-only data
- the Tauri command layer still returns some user-facing English strings directly

## Goals

The `v3.0.2` slice must:

1. make `en / de / hu` a real production feature rather than a partial UI layer
2. persist the selected locale across desktop restarts
3. remove backend-owned user-facing English phrases where a structured contract is more appropriate
4. publish and verify the real Windows `*-setup.exe` GitHub Release asset through the tag-triggered workflow

## Non-Goals

- no new product features unrelated to localization or release proof
- no additional platform targets beyond the existing Windows-first publish path
- no new branding system beyond the current temporary `FP` mark
- no rewrite of the entire request/result model when a targeted contract cleanup is sufficient

## Release Boundary

This design treats the next release as one focused slice:

- release target: `v3.0.2`
- content:
  - production localization completion
  - locale persistence
  - structured request/result localization contract cleanup
  - release-note and README updates needed for the new state
  - real tag-based GitHub Release asset proof

The release should not be split into a localization release and a later distribution-proof release.

## Architecture

The work is split into three layers.

### 1. Rust/Tauri Contract Layer

Files primarily involved:

- `crates/fuseprobe-core/src/request.rs`
- `apps/desktop/src-tauri/src/commands/request.rs`
- `apps/desktop/src/lib/contracts.ts`
- `apps/desktop/src/lib/tauri.ts`

Design rule:

- the backend should return stable state and metadata
- the frontend should render human-readable localized copy

The backend should continue to return raw facts such as:

- `statusCode`
- `reason`
- `durationMs`
- `byteCount`
- `contentType`
- `charset`
- `responseHeaders`
- machine-readable policy or warning identifiers

The backend should stop being the source of truth for user-facing English display strings where those strings are part of the regular UI contract.

Examples:

- replace `policy_note: "redirects disabled by policy"` with a stable policy code such as `redirects_disabled`
- stop treating formatted byte labels as backend-owned presentation when the frontend can derive localized display from numeric byte counts
- prefer stable error or warning codes plus optional safe detail text instead of full English-only UI messages

### 2. Frontend Localization Layer

Files primarily involved:

- `apps/desktop/src/features/i18n/locale.tsx`
- `apps/desktop/src/features/workbench/WorkbenchPage.tsx`
- `apps/desktop/src/features/workbench/RequestEditor.tsx`
- `apps/desktop/src/features/workbench/ResponsePanel.tsx`
- `apps/desktop/src/features/workbench/HistoryPanel.tsx`
- `apps/desktop/src/features/settings/SecuritySettingsPanel.tsx`
- `apps/desktop/src/features/history/useHistory.ts`
- `apps/desktop/src/features/settings/useSecuritySettings.ts`
- `apps/desktop/src/features/workbench/useWorkbench.ts`

Design rule:

- all user-facing desktop copy should come from one locale system
- components should consume translated strings, not embed language-specific fallback text

This layer owns:

- UI labels
- placeholders
- panel titles
- warning and error render text
- policy-note render text
- response metadata labels
- any user-facing derived string composed from structured contract data

### 3. Preset and Template Presentation Layer

Files primarily involved:

- `apps/desktop/src/features/presets/presets.ts`
- `apps/desktop/src/features/workbench/RequestEditor.tsx`
- `apps/desktop/src/features/workbench/HistoryPanel.tsx`

Design rule:

- presets and templates should have stable keys in data
- locale-specific names and descriptions should come from the locale catalog

This prevents the current pattern where English preset names are used as both storage value and translation lookup key.

## Locale Persistence

Files primarily involved:

- `apps/desktop/src/features/i18n/locale.tsx`

The selected locale should persist locally on the desktop side.

Recommended baseline:

- store the selected locale in browser-side local storage for the desktop shell
- initialize the locale provider from stored value when present
- fall back to `en` only when there is no stored value or the value is invalid

This is sufficient for the current product scope. Locale persistence does not need a Rust-backed settings file in this slice.

## Structured Contract Design

The request/result contract should move toward this pattern:

- backend returns raw values and stable identifiers
- frontend maps identifiers to localized copy

Representative fields:

- `statusCode: number`
- `reason: string`
- `byteCount: number`
- `policyCode: "redirects_disabled" | ...`
- `warningCode: string | null`
- `warningDetails: string | null`
- `errorCode: string | null`
- `errorDetails: string | null`

Important constraint:

- safe technical details may still be surfaced when useful
- those details should remain secondary to a stable `code`
- localized UI text should be derived on the frontend from the `code`

This avoids hard-coding English UI copy inside Rust while preserving debuggability.

## Translation Scope

The release should cover all currently exposed desktop shell copy for the supported languages:

- shell and topbar strings
- request editor strings
- response panel strings
- history panel strings
- security settings panel strings
- notices and warnings
- hook-level idle/error/warning messages
- auth preset names and descriptions
- template descriptions and example descriptions where they are visible in the UI now or will become visible in this release

Translation quality target:

- not placeholder-level
- not partially translated
- consistent terminology inside each locale

## Testing Strategy

### Frontend

Add or update tests for:

- locale initialization from persisted storage
- locale change persistence after selection
- shell text switching between `en / de / hu`
- localized rendering of preset/auth/template labels
- localized rendering of structured policy, warning, and error states

### Rust/Tauri

Add or update tests for:

- request command contract returns structured policy metadata instead of backend-owned display strings where changed
- stable warning and error code behavior remains intact
- no accidental regression in request execution, history, or settings behavior

### Release Verification

For `v3.0.2`:

1. build and test locally
2. update release notes and changelog
3. create the `v3.0.2` tag
4. push commit and tag
5. verify the `Release Desktop` workflow succeeds on the tag
6. verify the GitHub Release contains the Windows `*-setup.exe`
7. install and launch the published asset on a clean Windows machine

This release is not complete until the tag-triggered GitHub Release asset path is verified successfully.

## Documentation Updates

Files expected to change:

- `README.md`
- `CHANGELOG.md`
- `docs/releases/release-v3.0.2.md`
- `docs/plans/2026-03-16-thread-handoff.md`
- status docs that still describe localization as pending

Documentation must reflect:

- `en / de / hu` is now production-ready
- the next release proved the real GitHub Release installer path

## Risks

### Risk: backend/frontend contract churn breaks tests

Mitigation:

- keep the contract cleanup narrow
- add typed contract tests before broad UI rewrites
- prefer additive migration where practical, then remove obsolete fields once tests are green

### Risk: localization remains half-complete because some strings are hidden in hooks or preset data

Mitigation:

- audit every current user-facing string source
- treat preset/template data as part of localization scope
- reject the release if English-only UI copy still leaks in supported locales

### Risk: release proof fails late in the cycle

Mitigation:

- keep the release workflow unchanged unless a concrete defect is discovered
- perform the tag-based publish proof only after the app and docs are green locally

## Exit Criteria

This design is complete when `v3.0.2` ships with all of the following true:

- locale selection persists across restarts
- desktop UI copy is production-complete for `en / de / hu`
- preset and template presentation is localization-aware
- backend-owned UI phrases are replaced by structured metadata where needed
- all relevant local tests pass
- the GitHub Release for `v3.0.2` contains the Windows NSIS setup asset
- the published setup asset is installed and launched successfully on a clean Windows machine
