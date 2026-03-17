# Fuseprobe v3.0.2

Release date: 2026-03-17

## Summary

`v3.0.2` closes the first production localization slice for the Tauri desktop shell and finishes the desktop-side contract cleanup that localization needed.

This release keeps the same Windows-first product direction, but the UI is no longer dependent on backend-owned English prose for core notices, warnings, response metadata, and preset/template presentation.

## Highlights

- persisted locale selection across restart
- production-ready `en / de / hu` UI copy across the workbench, history panel, security controls, and notice surfaces
- localized auth preset and API template presentation from stable keys instead of English display labels
- structured response metadata for status, byte count, redirect handling, truncation, and binary rendering
- structured Tauri error and persistence-warning codes mapped to localized frontend copy

## Notes

- no broad security-policy relaxation was introduced in this release
- history redaction and local-target safety behavior remain unchanged
- the current storage path no longer depends on the older NanoMan-era directory fallback
- this is the first release line intended to prove the real tag-based GitHub Release installer asset flow, not just a local `tauri build`

## Security Review

- unsafe-target validation now blocks `localhost`-style alias domains and best-effort DNS resolutions to loopback/private addresses unless `Unsafe mode / Local targets` is explicitly enabled
- `npm audit` is clean for the desktop package set
- `cargo audit` reports only upstream/transitive warnings from the Tauri ecosystem, with the Windows release line not blocked by a direct Fuseprobe-owned Rust advisory

## Local Verification

The release candidate was verified locally before tagging with:

- `npm --prefix apps/desktop test -- --run`
- `npm --prefix apps/desktop run build`
- `cargo test`
- `npm --prefix apps/desktop run tauri:build`

Local package artifact:

- `target/release/bundle/nsis/Fuseprobe_3.0.2_x64-setup.exe`

## Install Note

For Windows users, the intended delivery path is the release `*-setup.exe` asset attached to the GitHub Release. A raw repository clone is a source tree, not the normal end-user install path.

## Maintainer Verification

Before treating `v3.0.2` as shipped:

1. confirm the GitHub Release contains the expected `Fuseprobe_3.0.2_x64-setup.exe` asset
2. download that asset onto a clean Windows machine
3. run the installer and launch Fuseprobe from the installed shortcut or Start menu entry
4. verify locale switching works for English, German, and Hungarian
5. verify the selected locale persists after restart
6. verify localized warnings and response metadata render correctly in the installed app
7. verify the desktop app starts without opening a separate console window
