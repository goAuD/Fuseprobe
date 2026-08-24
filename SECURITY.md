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

## Release signing

Windows installer assets published on the GitHub Releases page are currently
unsigned. Until code signing lands, SmartScreen may flag the installer as
untrusted on first run. The canonical distribution artifact is still the
`*-setup.exe` file attached to a tagged release, alongside its companion
`*.sha256` file that can be used to verify download integrity.
