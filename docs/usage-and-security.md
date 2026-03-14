# Fuseprobe Usage and Security

Fuseprobe is built as a security-first offline desktop API client. The defaults are intentionally conservative so the app is safer on everyday workstations, shared machines, and development laptops.

## Default Security Behavior

### Local and private targets are blocked by default

Fuseprobe blocks these target classes unless you explicitly opt in:

- `localhost`
- loopback addresses
- private IP ranges
- link-local ranges
- metadata-style endpoints

This reduces accidental local-network probing and makes the out-of-the-box desktop behavior safer.

If you intentionally need local or internal targets, enable `Unsafe mode / Local targets` in the desktop security panel and confirm the warning.

### History persistence is off by default

Fuseprobe keeps request history in memory for the current session unless you explicitly enable `History persistence`.

This avoids writing request activity to disk unless you deliberately choose that behavior for the current device.

Enabling history persistence also requires explicit confirmation.

## What Gets Stored

When history persistence is enabled, Fuseprobe stores a minimal history record:

- HTTP method
- redacted request URL
- response status
- elapsed time
- timestamp

Fuseprobe does **not** persist:

- request body
- custom request headers
- bearer tokens from headers
- API keys from headers

Persisted URLs are sanitized before they are written:

- fragments are removed
- query values are redacted

## What the Security Toggles Mean

### Unsafe mode / Local targets

Use this only when you intentionally need to test:

- local development servers
- private/internal services
- controlled lab or workstation targets

Leave it off the rest of the time.

### History persistence

Use this only when you explicitly want local request history to survive app restarts on that machine.

On sensitive or shared devices, the safer choice is to leave it off.

## Practical Guidance

### Public API testing

For normal public API work, the default security settings should usually be enough.

### Local development workflows

If you test `localhost` or internal endpoints often, enable unsafe targets deliberately, use them, then switch the setting back off.

### Shared or high-sensitivity machines

Keep `History persistence` off unless you have a specific reason to persist local history.

## Local Storage

When persistence is enabled, Fuseprobe stores local settings and redacted history in its app config directory on the current machine.

Fuseprobe does not require cloud storage, telemetry, or online synchronization for normal operation.
