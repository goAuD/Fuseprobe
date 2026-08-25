# Fuseprobe v4.0.0

Release date: 2026-08-25

## Summary

`v4.0.0` is a licensing and project-infrastructure release. **Fuseprobe is now open source under the Apache License 2.0**, where previous `v3.x` releases were source-available for noncommercial use only. Commercial use no longer requires permission.

The major version reflects the licensing change, not a change in the software. The application code is untouched by this release: no request-path behaviour, no security defaults, no UI copy, no localization changes. Everything else here is repository and distribution work that accumulated since `v3.0.5`: a public landing page, a security policy, security scanning that reports where you can see it, and the resolution of every open dependency alert.

## Highlights

- **License changed to Apache License 2.0.** Apache 2.0 was chosen over MIT for two properties MIT does not have: an explicit patent grant, and a withholding of trademark rights that keeps the Fuseprobe name protected while the code itself is free to use, modify and redistribute.
- **New `NOTICE` file** recording copyright and the terms each earlier release line shipped under.
- **New `SECURITY.md`.** The repository is public and previously had no security policy, so anyone finding a vulnerability had no private disclosure path and a public issue was their only option.
- **New public landing page** at <https://goaud.github.io/Fuseprobe/>, served from `site/` and deployed by a `Deploy Pages` workflow. It is deliberately not served from `docs/`, which is tracked and would have published `usage-and-security.md` and every release note as a web page.
- **Semgrep findings now reach GitHub code scanning.** `SEMGREP_APP_TOKEN` had been in repository secrets since 11 August with no workflow referencing it, so findings existed only on semgrep.dev. A new workflow runs `semgrep ci` with the token and uploads SARIF, putting findings next to CodeQL.
- **All 19 open Dependabot alerts resolved**, and all three semgrep findings with them.
- **New screenshot capture script** at `scripts/capture_window.py`, replacing hand-captured images that a screen grabber had washed out.

## Licensing Detail

Relicensing is **not retroactive**. Every previously published release keeps the terms it shipped with:

| Releases | License |
|---|---|
| `v2.1.0` and earlier | MIT |
| `v3.0.0` through `v3.0.5` | PolyForm Noncommercial 1.0.0 |
| `v4.0.0` onward | Apache License 2.0 |

`NOTICE` records this so the history is not lost. `COMMERCIAL-USE.md` has been removed, since it documented a restriction that no longer exists.

The relicense was clean to make: the commit history is the copyright holder plus Dependabot lockfile bumps, so there were no contributor agreements to collect.

The `LICENSE` file carries the canonical Apache 2.0 text, kept intact including its appendix. Per Apache's own guidance the copyright line belongs in `NOTICE` rather than being filled into the license body.

## Security

Every one of the 19 open Dependabot alerts was on a **transitive** dependency, so all of them were cleared by a lockfile refresh with no manifest change. Neither `package.json` nor either `Cargo.toml` needed editing; the existing semver ranges already admitted the fixes.

| Ecosystem | Package | From | To |
|---|---|---|---|
| cargo | `quinn-proto` | 0.11.14 | 0.11.17 |
| cargo | `rustls-webpki` | 0.103.12 | 0.103.15 |
| cargo | `serde_with` | 3.17.0 | 3.22.0 |
| npm | `undici` | 7.25.0 | 7.29.0 |
| npm | `postcss` | 8.5.15 | 8.5.26 |
| npm | `nanoid` | 3.3.15 | 3.3.18 |

Two of these deserve context. Every npm alert arrived through a **devDependency**: `undici` via `jsdom` at test time, `postcss` and `nanoid` via `vite` at build time. The shipped bundle has three runtime dependencies, `@tauri-apps/api`, `react` and `react-dom`, so none of those CVEs were reachable from the released application. The `quinn-proto` alert was a **false positive**: the crate appears in no build graph on any target and survived only as a stale `Cargo.lock` entry that GitHub's dependency graph parses literally.

Dependabot now applies a **7-day cooldown** on all three ecosystems. Without one it proposes a version the day it is published, which is exactly the window in which a compromised release is most likely to slip through. This also resolved the three outstanding semgrep findings (`dependabot-missing-cooldown`, CWE-829 / OWASP A08).

Two further findings were cleared before tagging. The landing page favicon moved from an inline `data:` URI to a relative reference: the `missing-integrity` rule matches any `<link>` carrying an `href`, and a `data:` URI cannot answer it because there is no fetch to verify. And `glib 0.18.5` is recorded in `SECURITY.md` as an accepted risk rather than patched, because it cannot be patched here and does not reach the product: it arrives through `gtk`, which is Tauri's Linux backend, and `cargo tree -i glib` prints nothing on `x86_64-pc-windows-msvc`, the only target this release ships for. The advisory is fixed in `glib 0.20`, but `gtk 0.18.2` requires `glib ^0.18`, so moving off it needs Tauri to adopt a newer GTK upstream.

`tauri` moved 2.10.3 to 2.11.5 and `vite` 8.0.16 to 8.2.2 as part of the same refresh, alongside the weekly Dependabot batches for `jsdom`, `typescript`, `@testing-library/jest-dom` and the pinned GitHub Actions.

## Landing Page

The page is a single self-contained document with no build step. It follows the application's own palette so the page and the product read as one thing: ground `#0B0F12`, accent `#00FF99`, body text `#cfd6d1`, with the FP monogram inlined from `apps/desktop/public/fuseprobe-mark.svg`. It commits to a single dark surface rather than tracking the visitor's theme, matching the low-glare shell the application ships.

Four fixes landed on it after the first deploy, all found by measuring a real render rather than reading the source:

1. **The hero and screenshot ran edge to edge on mobile.** Both sections carry `.wrap`, which supplies the horizontal padding, and then set the `padding` shorthand for their vertical spacing. Equal specificity, later in the stylesheet, so the shorthand won and both horizontal sides collapsed to zero.
2. **iOS safe areas were unhandled.** The page now uses `viewport-fit=cover` with `env(safe-area-inset-*)`, so the dark surface runs edge to edge while content stays clear of the notch and the home indicator.
3. **Six links were below the 24px WCAG 2.5.8 target minimum**, at 20px.
4. **The layout compressed without limit.** `body` now holds a 320px floor. Reaching it cleanly also required capping three `auto-fit` grid tracks with `min(<size>, 100%)`, since an `auto-fit` track keeps demanding its minimum in a narrower container.

`apps/desktop/e2e/site.layout.spec.ts` now guards all of these with fourteen assertions across four widths. The assertions were confirmed non-vacuous by reintroducing each bug in turn: the padding shorthand fails four of fourteen, and the unscoped nav rule, the missing floor and the uncapped grid each fail one.

## Screenshot Capture

`assets/fuseprobe.png` is the hero image on the landing page and the illustration in the README, which makes it the most looked-at asset in the project. It had been produced with a screen grabber, which is the wrong tool for a dark application.

`scripts/capture_window.py` uses `PrintWindow` with `PW_RENDERFULLCONTENT`, which asks DWM for the window's own rendering rather than reading the composited desktop. That flag is required rather than optional here: without it, `PrintWindow` returns a blank client area for anything drawing through a child surface, which includes Tauri's WebView2. The script also marks itself per-monitor DPI aware before measuring, crops to `DWMWA_EXTENDED_FRAME_BOUNDS` to remove the invisible resize border Windows 10 and 11 report, and prints the darkest channel values so a washed-out capture is caught before it ships.

## Notes

- no product-scope changes to the request path, the history store, or the security settings panel
- no security-policy changes on the desktop request path
- no UI copy or localization changes
- the Windows installer remains unsigned and the Windows x64 NSIS setup executable is still the canonical distribution artifact

## Local Verification

The release candidate was verified locally before tagging with:

- `npm --prefix apps/desktop test -- --run`
- `npm --prefix apps/desktop run test:e2e`
- `cargo test --workspace`
- `npm --prefix apps/desktop run tauri:build`

Local package artifact:

- `target/release/bundle/nsis/Fuseprobe_4.0.0_x64-setup.exe`

## Install Note

For Windows users, the intended delivery path is the release `*-setup.exe` asset attached to the GitHub Release, plus the matching `*.sha256` file when published.

## Maintainer Verification

Before treating `v4.0.0` as shipped:

1. confirm the `Release Desktop` workflow triggered by the `v4.0.0` tag completes successfully on GitHub Actions
2. confirm the GitHub Release contains the expected `Fuseprobe_4.0.0_x64-setup.exe` asset
3. confirm the release also contains the matching `Fuseprobe_4.0.0_x64-setup.exe.sha256` asset
4. download the installer and checksum onto a clean Windows machine
5. verify the checksum matches before launch
6. run the installer and launch Fuseprobe from the installed shortcut or Start menu entry
7. verify the installed app version matches `4.0.0`
8. confirm GitHub now reports the repository license as Apache 2.0 rather than `other`
