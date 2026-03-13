# Fuseprobe Tauri MVP Parity Checklist

Date: 2026-03-12
Status: In progress

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

## Final MVP Release Gate

- [ ] request execution works end-to-end
- [ ] redirect policy matches Python baseline
- [ ] history redaction matches Python baseline
- [ ] history delete and clear work
- [ ] binary responses do not render as text
- [ ] JSON responses render in the formatted response view
