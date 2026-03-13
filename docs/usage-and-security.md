# Fuseprobe Usage and Security

Fuseprobe is designed to stay local, predictable, and explicit about risky behavior. The desktop shell uses strict defaults on purpose.

## Security Defaults

### Local and private targets are blocked by default

The desktop shell blocks:

- `localhost`
- private IP ranges
- link-local addresses
- metadata-style endpoints

This helps reduce accidental local-network probing and makes the default behavior safer on everyday workstations.

If you intentionally need those targets for development or internal testing, enable `Unsafe mode / Local targets` from the in-app security panel and confirm the warning.

### History persistence is off by default

The desktop shell keeps request history in memory for the current session unless you explicitly enable `History persistence`.

This avoids writing request activity to disk on shared or sensitive machines unless you choose it.

If you turn history persistence on, Fuseprobe asks for confirmation first.

## What Gets Stored When History Persistence Is Enabled

Fuseprobe stores only a minimal, redacted history record:

- HTTP method
- request URL in redacted form
- response status
- elapsed time
- timestamp

Fuseprobe does **not** persist:

- request body
- custom headers
- bearer tokens or API keys from headers

Persisted URLs are also sanitized before they are written:

- fragments are removed
- query values are redacted

## Practical Use

### Public APIs

For normal public API testing, the default settings should work without changes.

### Local development servers and internal endpoints

If you need `localhost`, a private subnet, or another internal target, enable `Unsafe mode / Local targets` first. Keep it off when you do not actively need it.

### Shared or sensitive machines

Leave `History persistence` off unless you explicitly want local request history on that device.

## Local Storage

When enabled, desktop settings and persisted history are stored in Fuseprobe's local app config directory on your device.

Fuseprobe does not require cloud storage or telemetry for normal operation.
