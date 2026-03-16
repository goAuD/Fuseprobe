# Fuseprobe Tauri MVP Parity Checklist

Date: 2026-03-12
Status: MVP parity, release-gate verification, and Windows packaging gate complete; public distribution hardening in progress

## Current Migrated Pieces

- [x] method selector
- [x] URL input
- [x] send action
- [x] request body editor
- [x] request headers editor
- [x] response view
- [x] response headers tab with real data
- [x] raw response tab with real data
- [x] history list surface
- [x] history delete action in the new shell
- [x] history clear action in the new shell
- [x] preset catalog surface
- [x] typed Tauri desktop bridge contracts
- [x] fallback browser-safe desktop shell preview
- [x] real request execution wired from Tauri into the Rust request core
- [x] persistent Rust-backed desktop history state with current-path save and legacy-path load fallback

## Still Pending for MVP Parity

No remaining feature parity gaps for the MVP shell.

The next work is release-gate verification and follow-on polish rather than another missing desktop feature.

## Packaging Gate

- [x] hardened desktop shell builds through `npm --prefix apps/desktop run tauri:build`
- [x] Windows release-candidate executable produced at `target/release/fuseprobe-desktop.exe`
- [x] Windows NSIS installer produced at `target/release/bundle/nsis/Fuseprobe_3.0.1_x64-setup.exe`
- [x] final legacy Python/Tkinter shell removal completed at packaging cut-over

## Public Distribution Gate

- [ ] GitHub Actions Windows release workflow publishes the NSIS setup executable on version tags
- [ ] README treats GitHub Releases as the canonical Windows install path
- [ ] release verification includes downloading and launching the published release asset on a clean Windows machine

## Final MVP Release Gate

- [x] request execution works end-to-end
- [x] redirect policy matches Python baseline
- [x] history redaction matches Python baseline
- [x] history delete and clear work
- [x] binary responses do not render as text
- [x] JSON responses render in the formatted response view

## Verification Notes

- End-to-end request execution, redirect behavior, truncation, binary fallback, and JSON formatting are covered in `crates/fuseprobe-core/tests/request_execution.rs`.
- History redaction, normalization, current-path save, and legacy-path load fallback are covered in `crates/fuseprobe-core/tests/history_store.rs`.
- Desktop history delete and clear behavior are covered in `apps/desktop/src/features/history/useHistory.test.ts`.
- Desktop formatted/raw response presentation is covered in `apps/desktop/src/features/workbench/ResponsePanel.test.tsx`.
- The current Windows release-candidate packaging path was verified with `npm --prefix apps/desktop run tauri:build`, producing `target/release/fuseprobe-desktop.exe`.
- The next verification step is a published GitHub Release asset flow, not another source-build parity check.
