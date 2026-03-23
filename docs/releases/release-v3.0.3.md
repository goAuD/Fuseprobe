# Fuseprobe v3.0.3

Release date: 2026-03-23

## Summary

`v3.0.3` rolls the recent desktop security hardening into the next Windows patch release and pairs it with a calmer, denser shell pass that improves the first-screen experience without changing the product scope.

This release keeps Fuseprobe firmly in the same local-first, Windows-first direction, but the desktop shell now lands with less glare, tighter vertical rhythm, and a cleaner default viewport fit for everyday request work.

## Highlights

- fail-closed hostname validation when target resolution fails during the unsafe-target policy check
- stricter Tauri CSP with inline styles removed from the desktop shell policy
- SHA-pinned third-party GitHub Actions on the CI and release path
- companion SHA-256 checksum assets for tagged Windows installer releases
- calmer syntax highlighting and less aggressive bright text across the workbench
- denser desktop layout so the three-column shell fits more cleanly into the first viewport
- refreshed README screenshot that matches the current shell

## Notes

- this release does not broaden the desktop command surface or relax the request security posture
- Windows installers remain unsigned for now, so SmartScreen can still warn on first launch
- the new checksum asset is an integrity aid, not a substitute for future code signing

## Security Review

- hostname resolution failures during request validation now fail closed instead of falling through to a later best-effort network request
- settings and history persistence now keep the temp-write-then-rename path without deleting the destination file first
- release automation now narrows write permission scope to the release job and pins third-party actions by exact commit SHA
- the desktop shell now returns a dedicated frontend-visible error code for validation-time host resolution failures

## UI Polish

- bright white text was softened across the shell for a lower-glare working surface
- JSON and response syntax colors were toned down to keep contrast readable without the earlier neon effect
- request, response, and aside sections now fit more naturally into the desktop viewport before any response body growth forces internal scrolling
- the request column keeps a larger body editor and a smaller headers editor while staying aligned with the adjacent desktop panels

## Local Verification

The release candidate was verified locally before tagging with:

- `npm --prefix apps/desktop test -- --run`
- `npm --prefix apps/desktop run build`
- `cargo test`
- `npm --prefix apps/desktop run tauri:build`

Local package artifact:

- `target/release/bundle/nsis/Fuseprobe_3.0.3_x64-setup.exe`

## Install Note

For Windows users, the intended delivery path is the release `*-setup.exe` asset attached to the GitHub Release, plus the matching `*.sha256` file when published.

## Maintainer Verification

Before treating `v3.0.3` as shipped:

1. confirm the GitHub Release contains the expected `Fuseprobe_3.0.3_x64-setup.exe` asset
2. confirm the release also contains the matching `Fuseprobe_3.0.3_x64-setup.exe.sha256` asset
3. download the installer and checksum onto a clean Windows machine
4. verify the checksum matches before launch
5. run the installer and launch Fuseprobe from the installed shortcut or Start menu entry
6. verify the calmer shell contrast and denser first-screen layout match the expected UI
