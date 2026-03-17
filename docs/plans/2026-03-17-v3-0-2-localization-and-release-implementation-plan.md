# Fuseprobe v3.0.2 Localization and Release Implementation Plan

Date: 2026-03-17
Source spec: `docs/superpowers/specs/2026-03-16-v3-0-2-localization-and-release-design.md`
Goal: ship `v3.0.2` with production-ready `en / de / hu` localization and a proven tag-based GitHub Release asset flow.

## Current Baseline

- Canonical app: `apps/desktop/` Tauri + React/Vite frontend with Rust command layer
- Rust core: `crates/fuseprobe-core/`
- Existing locale selector is visible, but locale resets to `en` on restart
- Preset/template text is still English-first
- Some backend-owned user-facing strings still leak through the Tauri request contract
- Release workflow exists at `.github/workflows/release-desktop.yml`, but the tag-based release-asset path is not yet proven

## Constraints

- Keep the work scoped to localization, release-proof, and the minimum contract cleanup needed for localization
- Do not change the existing Windows-first release workflow unless a concrete defect is found
- Prefer additive contract migration, then remove obsolete fields only after tests pass

## Preflight

Run before changing code:

```powershell
npm --prefix apps/desktop test -- --run
cargo test
npm --prefix apps/desktop run build
```

Expected:

- frontend tests pass
- Rust tests pass
- production frontend build passes

## Task 1: Add Locale Persistence and Regression Tests

Files:

- Modify: `apps/desktop/src/features/i18n/locale.tsx`
- Modify: `apps/desktop/src/App.test.tsx`
- Modify: `apps/desktop/src/features/workbench/WorkbenchPage.test.tsx`

Work:

- add persistent locale bootstrap from local storage
- persist locale on change
- validate unknown stored locale values and fall back to `en`
- add tests that cover:
  - default `en` without stored value
  - reading a stored locale
  - switching locale updates rendered shell text
  - switching locale writes the new value back to storage

Verification:

```powershell
npm --prefix apps/desktop test -- --run src/App.test.tsx src/features/workbench/WorkbenchPage.test.tsx
```

## Task 2: Move All Visible Desktop Copy Into the Locale Layer

Files:

- Modify: `apps/desktop/src/features/i18n/locale.tsx`
- Modify: `apps/desktop/src/features/workbench/RequestEditor.tsx`
- Modify: `apps/desktop/src/features/workbench/ResponsePanel.tsx`
- Modify: `apps/desktop/src/features/workbench/HistoryPanel.tsx`
- Modify: `apps/desktop/src/features/settings/SecuritySettingsPanel.tsx`
- Modify: `apps/desktop/src/features/history/useHistory.ts`
- Modify: `apps/desktop/src/features/settings/useSecuritySettings.ts`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.ts`

Work:

- audit and remove remaining hard-coded user-facing English strings from desktop components and hooks
- move ad hoc translation maps out of component internals where practical
- ensure the desktop shell uses locale-derived copy for:
  - notices
  - policy notes
  - response meta labels
  - idle states
  - user-facing warnings and errors generated on the frontend

Verification:

```powershell
npm --prefix apps/desktop test -- --run
```

## Task 3: Replace English-First Preset and Template Presentation With Stable Keys

Files:

- Modify: `apps/desktop/src/features/presets/presets.ts`
- Modify: `apps/desktop/src/features/i18n/locale.tsx`
- Modify: `apps/desktop/src/features/workbench/RequestEditor.tsx`
- Modify: `apps/desktop/src/features/workbench/HistoryPanel.tsx`
- Modify: `apps/desktop/src/features/presets/presets.test.ts`
- Modify: `apps/desktop/src/features/workbench/Workbench.integration.test.tsx`

Work:

- introduce stable identifiers for auth presets and API templates
- stop using English display strings as translation lookup keys
- render localized preset/auth/template names and descriptions from the locale catalog
- keep URL/method/example data where it already belongs, but move user-facing labels/descriptions to locale-backed lookup

Verification:

```powershell
npm --prefix apps/desktop test -- --run src/features/presets/presets.test.ts src/features/workbench/Workbench.integration.test.tsx
```

## Task 4: Introduce Structured Request Result Metadata for Localized Rendering

Files:

- Modify: `apps/desktop/src/lib/contracts.ts`
- Modify: `apps/desktop/src/lib/tauri.ts`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.ts`
- Modify: `apps/desktop/src/features/workbench/ResponsePanel.tsx`
- Modify: `apps/desktop/src-tauri/src/commands/request.rs`
- Modify: `apps/desktop/src/features/workbench/ResponsePanel.test.tsx`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.test.ts`

Work:

- change the request result contract so the backend returns machine-readable fields for renderable metadata
- move localized display composition to the frontend for:
  - policy note
  - byte-size label
  - any other user-facing metadata that is currently backend-owned but UI-rendered
- keep raw technical fields available for diagnostics

Suggested contract direction:

- add `statusCode`
- add `byteCount`
- replace `policyNote` with `policyCode`
- keep `reason` separately from localized UI copy

Verification:

```powershell
npm --prefix apps/desktop test -- --run src/features/workbench/ResponsePanel.test.tsx src/features/workbench/useWorkbench.test.ts
cargo test
```

## Task 5: Introduce Structured Error and Warning Codes Across the Tauri Boundary

Files:

- Modify: `apps/desktop/src/lib/contracts.ts`
- Modify: `apps/desktop/src/lib/tauri.ts`
- Modify: `apps/desktop/src/features/history/useHistory.ts`
- Modify: `apps/desktop/src/features/settings/useSecuritySettings.ts`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.ts`
- Modify: `apps/desktop/src-tauri/src/commands/request.rs`
- Modify: `apps/desktop/src-tauri/src/commands/history.rs`
- Modify: `apps/desktop/src-tauri/src/commands/settings.rs`
- Modify: `apps/desktop/src-tauri/src/state.rs`
- Modify: `crates/fuseprobe-core/src/request.rs`
- Modify: related frontend and Rust tests

Work:

- replace backend-owned user-facing English error and warning strings with stable codes plus optional safe details where needed
- map those codes to localized UI copy on the frontend
- preserve useful technical context without making English prose part of the public UI contract

Important:

- do not lose the existing security-sensitive sanitization behavior
- do not broaden the error surface unnecessarily

Verification:

```powershell
npm --prefix apps/desktop test -- --run
cargo test
```

## Task 6: Update Documentation and Version Metadata for v3.0.2

Files:

- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `CHANGELOG.md`
- Create: `docs/releases/release-v3.0.2.md`
- Modify: `README.md`
- Modify: `docs/plans/2026-03-16-thread-handoff.md`
- Modify: status docs that still describe localization as pending

Work:

- bump the desktop/release-facing version to `3.0.2`
- document production localization as shipped in the release notes and README
- record that `v3.0.2` is the first tag expected to prove the real GitHub Release installer path

Verification:

```powershell
Get-Content apps/desktop/package.json
Get-Content apps/desktop/src-tauri/Cargo.toml
Get-Content CHANGELOG.md
Get-Content docs/releases/release-v3.0.2.md
```

## Task 7: Full Local Verification Before Tagging

Run:

```powershell
npm --prefix apps/desktop test -- --run
npm --prefix apps/desktop run build
cargo test
```

Optional if local environment is ready:

```powershell
npm --prefix apps/desktop run tauri:build
```

Expected:

- all frontend tests green
- all Rust tests green
- frontend build green
- Windows installer build green if the local machine has the native prerequisites

## Task 8: Commit, Tag, Push, and Verify the Release Asset

Run:

```powershell
git status --short
git add .
git commit -m "feat: ship v3.0.2 localization release"
git tag v3.0.2
git push origin main
git push origin v3.0.2
```

Then verify:

```powershell
gh run watch --exit-status
gh release view v3.0.2
```

Expected:

- the `Release Desktop` workflow runs on the pushed tag
- the GitHub Release for `v3.0.2` contains the Windows `*-setup.exe`

## Task 9: Published Asset Smoke Check

Verification target:

- download the `v3.0.2` Windows setup asset from GitHub Releases
- install it on a clean Windows machine
- launch from the installed shortcut or Start menu entry
- confirm normal startup and no extra console window

If the clean-machine verification happens outside this repo session, record the result in:

- `docs/plans/2026-03-16-thread-handoff.md`
- `docs/releases/release-v3.0.2.md`

## Done Condition

The implementation is complete only when all of the following are true:

- locale persists across restart
- desktop UI copy is production-ready for `en / de / hu`
- preset/template presentation is localization-aware
- structured result/error/warning metadata is in place where the UI previously depended on backend English prose
- local test/build verification is green
- `v3.0.2` is tagged and pushed
- the GitHub Release contains the Windows NSIS setup asset
- the published asset has a recorded smoke-check result
