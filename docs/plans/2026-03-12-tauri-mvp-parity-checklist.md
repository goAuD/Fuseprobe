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

## Still Pending for MVP Parity

- [x] auth preset application flow
- [x] preset application into the request workbench
- [ ] persistent Rust-backed desktop history state instead of seeded fallback rows

## Final MVP Release Gate

- [ ] request execution works end-to-end
- [ ] redirect policy matches Python baseline
- [ ] history redaction matches Python baseline
- [ ] history delete and clear work
- [ ] binary responses do not render as text
- [ ] JSON responses render in the formatted response view
