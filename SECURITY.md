# Security Policy

## Reporting a vulnerability

Please do not open a public GitHub issue for suspected vulnerabilities. Send a
private report to the maintainer listed on the repository profile and we will
follow up on a disclosure timeline.

When reporting, include:

- affected version of Fuseprobe (see `CHANGELOG.md` or the in-app about panel)
- a minimal reproduction path or proof-of-concept
- the observed impact and, where possible, a suggested severity

## Supported versions

Only the current minor line on `main` receives security fixes. Older tagged
releases are not patched in place; the recommended action is to upgrade to the
latest published release.

## Accepted-risk advisories

The following upstream advisories are tracked against Fuseprobe and explicitly
accepted. Each entry records where the dependency enters the tree and why the
documented attack path does not reach a released build.

### glib, reliance on uncontrolled component

- **Where it enters the tree:** `glib 0.18.5`, pulled in through
  `gtk 0.18.2` by `tauri`, `tao` and `muda`. Confirmed with
  `cargo tree -i glib --target all`.
- **Why accepted:** the GTK stack is Tauri's **Linux** backend. On
  `x86_64-pc-windows-msvc`, the only target Fuseprobe releases for, `cargo tree -i glib`
  prints nothing: the crate is not in the build graph and no code from it reaches
  the published Windows installer. Windows builds use WebView2 instead.
- **Why it is not simply patched:** the advisory is fixed in `glib 0.20`, but
  `gtk 0.18.2` requires `glib ^0.18`, so `cargo update -p glib` locks zero
  packages. Moving off it needs Tauri to adopt a newer GTK upstream.
- **Revisit trigger:** when a Tauri release moves to `gtk 0.20` or later, or when
  Fuseprobe starts publishing a Linux build. Either one makes this reachable or
  fixable, and this entry should be removed after confirming with
  `cargo tree -i glib --target all`.

## Release signing

Windows installer assets published on the GitHub Releases page are currently
unsigned. Until code signing lands, SmartScreen may flag the installer as
untrusted on first run. The canonical distribution artifact is still the
`*-setup.exe` file attached to a tagged release, alongside its companion
`*.sha256` file that can be used to verify download integrity.
