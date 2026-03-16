# Fuseprobe v3.0.1

Release date: 2026-03-14

## Summary

`v3.0.1` is a small Windows desktop hotfix release.

## Fixed

- Windows release builds no longer open an extra console window alongside the desktop app

## Notes

- no product-scope changes
- no security-policy changes
- no request/history behavior changes

This release exists to make the packaged desktop app behave more like a normal GUI application on Windows.

## Install Note

For Windows users, the intended delivery path is the release `*-setup.exe` asset attached to the GitHub Release. A raw repository clone is a source tree, not the normal end-user install path.

## Maintainer Verification

Before treating a published hotfix as ready:

1. confirm the GitHub Release contains the expected `Fuseprobe_*_x64-setup.exe` asset
2. download that asset onto a clean Windows machine
3. run the installer and launch Fuseprobe from the installed shortcut or Start menu entry
4. verify the desktop app starts without opening a separate console window
5. verify the asset version matches the release tag
