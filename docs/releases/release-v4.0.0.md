# Fuseprobe v4.0.0

Release date: 2026-08-25

## Summary

`v4.0.0` is a licensing and project-infrastructure release. **Fuseprobe is now open source under the Apache License 2.0**, where previous `v3.x` releases were source-available for noncommercial use only. Commercial use no longer requires permission.

The release also carries the results of a white-box security audit of the request path. Five defects were found and fixed, and two of them made a claim this project makes publicly false. That work is described in its own section below, and it is the reason to install this version rather than only a reason to relicense.

The rest is repository and distribution work accumulated since `v3.0.5`: a public landing page, a security policy, security scanning that reports where you can see it, and the resolution of every open dependency alert.

## Highlights

- **License changed to Apache License 2.0.** Apache 2.0 was chosen over MIT for two properties MIT does not have: an explicit patent grant, and a withholding of trademark rights that keeps the Fuseprobe name protected while the code itself is free to use, modify and redistribute.
- **New `NOTICE` file** recording copyright and the terms each earlier release line shipped under.
- **New `SECURITY.md`.** The repository is public and previously had no security policy, so anyone finding a vulnerability had no private disclosure path and a public issue was their only option.
- **New public landing page** at <https://goaud.github.io/Fuseprobe/>, served from `site/` and deployed by a `Deploy Pages` workflow. It is deliberately not served from `docs/`, which is tracked and would have published `usage-and-security.md` and every release note as a web page.
- **Semgrep findings now reach GitHub code scanning.** `SEMGREP_APP_TOKEN` had been in repository secrets since 11 August with no workflow referencing it, so findings existed only on semgrep.dev. A new workflow runs `semgrep ci` with the token and uploads SARIF, putting findings next to CodeQL.
- **All 19 open Dependabot alerts resolved**, and all three semgrep findings with them.
- **New screenshot capture script** at `scripts/capture_window.py`, replacing hand-captured images that a screen grabber had washed out.

## Security Audit

A white-box audit of the request path was carried out on the application by its
copyright holder, to find and fix defects before users met them. Five were
confirmed and all five are fixed in this release.

Two of them made a claim this project makes publicly false, which is the reason
this section leads the release rather than trailing it.

### The target policy could be bypassed by rewriting the address

`is_unsafe_ipv6` classified addresses by asking whether they were loopback,
unique-local or link-local. `Ipv6Addr::is_loopback` matches only `::1`, so
`::ffff:127.0.0.1` is the same destination written differently and was not
recognised. The same held for the mapped forms of RFC1918 and link-local.

| Target | Before | After |
|---|---|---|
| `http://127.0.0.1/` | blocked | blocked |
| `http://[::ffff:127.0.0.1]/` | **allowed** | blocked |
| `http://169.254.169.254/` | blocked | blocked |
| `http://[::ffff:169.254.169.254]/` | **allowed** | blocked |
| `http://[::ffff:10.0.0.1]/` | **allowed** | blocked |

The metadata row is the serious one: cloud instance metadata was reachable with
default settings. The embedded address is now unmapped and classified as IPv4.
`metadata.goog` joins the reserved names.

### DNS rebinding reproduced

Validation resolved the hostname and inspected the addresses. `execute_request`
then connected, and the HTTP client resolved the name **a second time**, with
nothing tying the two lookups together. A DNS server answering the first query
with a public address and the second with a loopback address defeated the check
entirely.

The fix is architectural rather than a patch. The name is resolved once, the
validated addresses are held in a per-request cache, and that cache is wired into
the HTTP client's own resolver. Every connection the client opens, including each
redirect hop, goes to an address that was validated.

The resolver additionally fails closed: if it is ever asked for a host the policy
did not approve, it refuses instead of resolving. Under an active policy that
should be unreachable, and the point of the change is not to depend on that being
true.

### Carrier NAT space was treated as public

`100.64.0.0/10` is RFC 6598 shared address space, used routinely inside cloud and
Kubernetes networks, so it is reachable internal surface in exactly the
environments this policy protects. It is now blocked, along with `0.0.0.0/8`.

Four other ranges (`192.0.0.0/24`, `198.18.0.0/15`, `224.0.0.0/4`, `240.0.0.0/4`)
were considered and deliberately left reachable rather than blocked reflexively.

### Redirects were never re-checked

Following a redirect applied only a hop counter. A permitted public URL could
redirect to a blocked destination and the policy was consulted exactly once, at
the start. Every hop is now revalidated against the same policy, and the ten hop
limit is unchanged.

This sat behind a setting that is off by default, which lowered its severity
without making it correct.

### Confirmation for risky settings was drawn, not enforced

The interface asked for confirmation before switching on a risky setting. The
backend did not require it, so the guarantee held only for callers that chose to
honour it. Confirmation is now enforced where the setting is written, and an
unconfirmed change is rejected.

### Also fixed

`user:password@` credentials embedded in a URL survived into stored history and
into displayed URLs. They are now stripped.

### What the audit did not find

Four of the five public security claims were checked and needed no change:
unresolvable hostnames already failed closed, history already stayed in memory
until persistence was enabled, and disabling persistence already removed the file
rather than merely stopping new writes. Those were confirmed by observation
rather than by reading the code, and are covered by tests.

Every fix ships with a regression test that was demonstrated to fail before it.

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

For Windows users, the intended delivery path is the release `*-setup.exe` asset attached to the GitHub Release, plus the matching `*.sha256` file.

**Windows will warn you the first time you run this.** The installer is not code signed, so SmartScreen shows an "unknown publisher" dialog. This is a reputation check, not a malware detection: SmartScreen has no history for a new unsigned file, and every release starts from zero because each build has a different hash.

If you would rather verify than trust, every release ships a `*.sha256` next to the installer. Compare it before you run anything:

```powershell
Get-FileHash -Algorithm SHA256 .\Fuseprobe_4.0.0_x64-setup.exe
```

Code signing is a cost decision, not an oversight. It proves who published the file, it does not make the application safer, and the checksum above already covers tampering.

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
