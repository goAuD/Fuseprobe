# Fuseprobe v3.0.5

Release date: 2026-04-20

## Summary

`v3.0.5` is a small UI fix plus regression coverage release. It restores the request panel body and headers editors to a usable default size in the standard desktop window and makes the `resize: vertical` grip work again, and it adds a Playwright end-to-end suite that guards exactly this class of layout regression on every CI run.

This release does not change the request security posture and does not introduce new product features.

## Highlights

- request panel textareas no longer render collapsed in the default desktop window; the `resize: vertical` grip on the body and headers editors enlarges them again instead of being silently overridden by the sidebar flex layout
- new Playwright suite at `apps/desktop/e2e/workbench.layout.spec.ts` covers three viewports (1400×900, 1280×720, 1024×700) with three assertions each: textarea render heights, horizontal-overflow absence, and explicit-height retention (the proxy for the resize grip)
- new `Frontend E2E` CI job runs the suite against the production `vite preview` build on every push and pull request, and uploads the Playwright HTML report as a workflow artifact on failure
- Dependabot weekly batch absorbed: `react` / `react-dom` `19.2.4 → 19.2.5`, `@vitejs/plugin-react` `6.0.0 → 6.0.1`, `jsdom` `28.1.0 → 29.0.2`, `typescript` `5.9.3 → 6.0.3`, `vitest` `4.1.0 → 4.1.4`, plus the GitHub Actions bumps `actions/checkout` `5.0.1 → 6.0.2`, `actions/setup-node` `4.4.0 → 6.3.0`, `actions/upload-artifact` `4.6.2 → 7.0.1`

## Notes

- no product-scope changes to the request path, the history store, or the security settings panel
- no security-policy changes on the desktop request path
- no UI copy or localization changes
- the Windows installer remains unsigned and the Windows x64 NSIS setup executable is still the canonical distribution artifact

## UI Fix Detail

The desktop breakpoint previously used nested flex ratios (`flex: 1.35 1 0` on the body editor card, `flex: 0.85 1 0` on the headers card, `flex: 1; max-height: none` on the textareas themselves) to stretch the request panel to fill the sidebar column. In the default desktop window this produced visibly squished editors and — worse — the `flex-basis: 0` on the textareas discarded the inline `height` that the browser sets when the user drags the native CSS resize grip, so the grip was purely cosmetic.

The fix replaces the flex-stretch sizing with explicit `min-height` / `max-height` values on the textareas (160 / 110 px minimums at the desktop breakpoint, 140 / 92 px at the denser short-window breakpoint, both capped at percentage-of-viewport maxima). The textareas are no longer flex children that compete for the panel's vertical budget, which means the browser's `resize: vertical` now survives and the user can drag the grip to enlarge either editor.

## Regression Coverage

Three Playwright tests run per viewport so the suite produces nine assertions per CI run:

1. `body and headers textareas render with usable height` — guards the specific symptom of the UI regression (`#request-body ≥ 110 px`, `#request-headers ≥ 90 px`)
2. `request panel does not overflow horizontally` — guards the adjacent failure mode where a flex miscalculation pushes the workspace grid wider than the viewport
3. `editor-input honors explicit height after layout` — proxies the native resize grip by setting inline `height` on the textarea and asserting the new height survives the layout pass; the previous `flex: 1; flex-basis: 0` rule would have made this fail

## Local Verification

The release candidate was verified locally before tagging with:

- `npm --prefix apps/desktop test -- --run`
- `npm --prefix apps/desktop run test:e2e`
- `cargo test`
- `npm --prefix apps/desktop run tauri:build`

Local package artifact:

- `target/release/bundle/nsis/Fuseprobe_3.0.5_x64-setup.exe`

## Install Note

For Windows users, the intended delivery path is the release `*-setup.exe` asset attached to the GitHub Release, plus the matching `*.sha256` file when published.

## Maintainer Verification

Before treating `v3.0.5` as shipped:

1. confirm the `Release Desktop` workflow triggered by the `v3.0.5` tag completes successfully on GitHub Actions
2. confirm the GitHub Release contains the expected `Fuseprobe_3.0.5_x64-setup.exe` asset
3. confirm the release also contains the matching `Fuseprobe_3.0.5_x64-setup.exe.sha256` asset
4. download the installer and checksum onto a clean Windows machine
5. verify the checksum matches before launch
6. run the installer and launch Fuseprobe from the installed shortcut or Start menu entry
7. verify the installed app version matches `3.0.5`
