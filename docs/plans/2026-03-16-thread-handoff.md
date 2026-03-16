# Fuseprobe Thread Handoff

Date: 2026-03-16
Status: clean checkpoint, ready for next session

## Repo State

- canonical repo path: `D:\GitHub\Fuseprobe`
- branch: `main`
- worktree: clean

Latest commits:

- `ba70f45` `brand: align desktop icon set with FP mark`
- `77d4ccf` `docs: record temporary FP branding direction`
- `5139605` `docs: prioritize release installer distribution`
- `bc79103` `ci: add Windows desktop release workflow`
- `80e0e7f` `docs: add release distribution execution plan`
- `7a84e09` `docs: capture release distribution design`

## Current Product State

- canonical app: `Tauri + React/Vite + Rust`
- legacy Python/Tkinter shell is removed from mainline
- security hardening gate is complete
- Windows packaging gate is complete
- temporary in-house `FP` badge branding is now aligned across:
  - navbar mark
  - favicon
  - desktop icon set

## What Was Completed In This Thread

### Windows packaging and docs

- enabled Tauri NSIS bundling in [tauri.conf.json](/d:/GitHub/Fuseprobe/apps/desktop/src-tauri/tauri.conf.json)
- verified local setup build output:
  - `target/release/bundle/nsis/Fuseprobe_3.0.1_x64-setup.exe`
- rewrote the public README so GitHub Release installer download is the primary Windows user path
- clarified that raw `target/release/fuseprobe-desktop.exe` is not the normal public distribution artifact
- documented Windows source-build prerequisites:
  - Rust
  - Node/npm
  - Visual Studio Build Tools 2022
  - Desktop development with C++
  - MSVC v143
  - Windows 10/11 SDK
  - WebView2
  - Visual Studio developer shell requirement on some machines

### Release/distribution model

- approved design: source-only public repo, release installer for end users
- approved scope: Windows-first publish, cross-platform-ready workflow structure
- approved next functional slice after distribution: production localization for `en / de / hu`

### GitHub Actions

- CodeQL workflow exists:
  - [codeql.yml](/d:/GitHub/Fuseprobe/.github/workflows/codeql.yml)
- Windows desktop release workflow exists:
  - [release-desktop.yml](/d:/GitHub/Fuseprobe/.github/workflows/release-desktop.yml)

Release workflow behavior:

- `workflow_dispatch`:
  - uploads Actions artifact only
- `push` on `v*` tag:
  - uploads Actions artifact
  - uploads GitHub Release asset via `softprops/action-gh-release`

### Branding

- existing shared mark: [fuseprobe-mark.svg](/d:/GitHub/Fuseprobe/apps/desktop/public/fuseprobe-mark.svg)
- Tauri icon set regenerated from that same mark:
  - [icons](/d:/GitHub/Fuseprobe/apps/desktop/src-tauri/icons)

## Canonical Docs To Continue From

- architecture/scope:
  - [2026-03-11-tauri-react-rust-platform-migration-design.md](/d:/GitHub/Fuseprobe/docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md)
- execution plan:
  - [2026-03-12-tauri-react-rust-mvp-implementation-plan.md](/d:/GitHub/Fuseprobe/docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md)
- roadmap/status:
  - [2026-03-10-hardening-and-architecture-roadmap-design.md](/d:/GitHub/Fuseprobe/docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md)
- parity/release gate:
  - [2026-03-12-tauri-mvp-parity-checklist.md](/d:/GitHub/Fuseprobe/docs/plans/2026-03-12-tauri-mvp-parity-checklist.md)

## Known Open Items

### Immediate

- verify the release workflow on a real version tag so the `*-setup.exe` lands as a GitHub Release asset, not just as an Actions artifact
- optionally make manual dispatch easier to promote/publish later, if desired

### Product / feature

- complete localization for the already present `en / de / hu` selector
- final real logo/brand system still open; current `FP` mark is intentionally temporary

### GitHub / infra

- CodeQL/GitHub code scanning had prior GitHub-side configuration friction
- repo-owned workflow was corrected, but any remaining red GitHub state may still be platform-side rather than repo-code-side

## Recommended Next Step

If continuing product/distribution work:

1. create or use the next version tag
2. verify that `Release Desktop` uploads the Windows `*-setup.exe` to the GitHub Release
3. confirm the release page is now enough for a normal Windows user
4. then start the localization slice

If continuing contributor/dev-experience work:

1. add a small Windows preflight script for local source-build validation
2. keep it contributor-facing only, not part of the normal user install path

## Quick Verification Commands

Frontend:

```powershell
npm --prefix apps/desktop test -- --run
```

Rust:

```powershell
cargo test
```

Local Windows package build:

```powershell
npm --prefix apps/desktop run tauri:build
```

Expected installer path:

```text
target/release/bundle/nsis/Fuseprobe_3.0.1_x64-setup.exe
```
