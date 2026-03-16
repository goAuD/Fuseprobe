# Fuseprobe v3.0.0

Release date: 2026-03-14

## Summary

`v3.0.0` marks the platform cut-over to the Tauri desktop shell.

Fuseprobe is now defined by:

- a Tauri desktop shell
- a React/Vite UI
- a Rust request/security/history core

This release is not a small UI refresh. It is the point where the modern desktop shell becomes the canonical product direction.

## Highlights

- Canonical desktop shell moved to `Tauri + React/Vite + Rust`
- Security-first desktop defaults are now enforced in the primary app path
- Local/private targets are blocked by default unless explicitly enabled
- History persistence is off by default unless explicitly enabled
- The desktop shell now supports English, German, and Hungarian UI strings
- The desktop UI has been hardened with reusable controls, safer confirmation flows, and clearer non-blocking notices

## Included Improvements

- real Rust-backed request execution in the desktop shell
- response, headers, and raw response inspection
- formatted JSON response rendering with brand-aware syntax coloring in the response view
- template-driven request setup
- public template catalog updated so the first default template is a usable public endpoint instead of a localhost-only target
- persisted security settings
- stricter history redaction before disk persistence
- non-null production CSP and narrowed Tauri capability scope
- request body/header ceilings and single-flight request backpressure
- verified Windows release-candidate build path

## Security Notes

This release intentionally favors safer defaults over convenience:

- local, private, link-local, and metadata-style targets are blocked by default
- request history is session-only by default
- risky settings require explicit confirmation before enablement

These are product design choices, not omissions.

## Upgrade Notes

- the Tauri shell is now the primary and only desktop app in the mainline repository
- the older Python/Tkinter implementation has been removed from the shipping branch to reduce attack surface and eliminate dual-runtime drift
- legacy local history/settings can still be migrated forward when present

## Docs

- public usage/security notes: `docs/usage-and-security.md`
- migration and architecture context: `docs/plans/`

## Install Note

For Windows users, the intended delivery path is the release `*-setup.exe` asset attached to the GitHub Release. A raw repository clone is a source tree, not the normal end-user install path.
