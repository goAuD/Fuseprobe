# Fuseprobe v3.0.4

Release date: 2026-04-16

## Summary

`v3.0.4` is a CI and dependency security maintenance release. It completes the SHA-pinning effort introduced in `v3.0.3`, unblocks the Windows desktop release workflow after a third-party Rust action was blocked by GitHub Actions policy, and rolls in the Dependabot-reported transitive Rust advisories.

This release does not change the product surface or the request security posture. It exists to get the tag-driven Windows installer build running again and to clear the open security alerts against the `main` branch.

## Highlights

- resolved outstanding Dependabot security alerts on transitive Rust dependencies (`rand 0.9.2 → 0.9.3`, `rustls-webpki 0.103.10 → 0.103.12`)
- the Dependabot config is now a valid `version: 2` multi-ecosystem setup covering `cargo`, `npm` (desktop), and `github-actions` under a single weekly batch
- every third-party GitHub Action on the CI and release paths is now pinned by full commit SHA, with the floating `@v*` refs gone
- replaced the blocked `dtolnay/rust-toolchain` action in CI and the release workflow with a direct `rustup toolchain install stable --profile minimal` step
- replaced the blocked `softprops/action-gh-release` third-party action with the preinstalled `gh release` CLI path, so the tag-triggered Windows build no longer fails at workflow startup against the repo's selected-actions + required-SHA-pinning policy

## Notes

- no product-scope changes
- no security-policy changes on the desktop request path
- no UI or localization changes
- the Windows installer remains unsigned and the Windows x64 NSIS setup executable is still the canonical distribution artifact

## Security Review

- `rustls-webpki` was bumped through the Cargo `security-updates` group to clear the upstream advisory reported by Dependabot for the Rust dependency tree
- `rand` was bumped as a companion transitive update so the `rustls/quinn` path stays on a coherent dependency set
- pinning CI and release actions by commit SHA closes the remaining "floating action ref" finding that was left open after the `v3.0.3` release notes were written but before the pinning commit actually landed
- the Rust toolchain bootstrap step no longer depends on a third-party action allow-list entry, which removes an external trust point from the Windows installer build path

## CI Fix

The previous tag-triggered `Release Desktop` run was blocked at workflow startup because the repository enforces `allowed_actions: selected` plus `sha_pinning_required: true`, and two third-party actions (`dtolnay/rust-toolchain` and `softprops/action-gh-release`) were not on the allow-list under that policy. Both actions are now gone from the release path:

- Rust toolchain setup runs `rustup` directly instead of the third-party action
- release asset creation and upload now use the `gh release create` / `gh release upload` CLI that ships preinstalled on GitHub runners, authenticated with the built-in `GITHUB_TOKEN`

This keeps the Windows installer build reproducible with zero third-party actions on the release path.

## Local Verification

The release candidate was verified locally before tagging with:

- `npm --prefix apps/desktop test -- --run`
- `npm --prefix apps/desktop run build`
- `cargo test`
- `npm --prefix apps/desktop run tauri:build`

Local package artifact:

- `target/release/bundle/nsis/Fuseprobe_3.0.4_x64-setup.exe`

## Install Note

For Windows users, the intended delivery path is the release `*-setup.exe` asset attached to the GitHub Release, plus the matching `*.sha256` file when published.

## Maintainer Verification

Before treating `v3.0.4` as shipped:

1. confirm the `Release Desktop` workflow triggered by the `v3.0.4` tag completes successfully on GitHub Actions
2. confirm the GitHub Release contains the expected `Fuseprobe_3.0.4_x64-setup.exe` asset
3. confirm the release also contains the matching `Fuseprobe_3.0.4_x64-setup.exe.sha256` asset
4. download the installer and checksum onto a clean Windows machine
5. verify the checksum matches before launch
6. run the installer and launch Fuseprobe from the installed shortcut or Start menu entry
7. verify the installed app version matches `3.0.4`
