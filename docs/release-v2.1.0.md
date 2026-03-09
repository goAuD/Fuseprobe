# Fuseprobe v2.1.0

Release date: 2026-03-09

## Highlights

- Fuseprobe is now the public product name across the app, repository, docs, and assets.
- The desktop UI has been tightened up with a darker black/graphite look and calmer burnt-copper accents.
- History now lives under `~/.fuseprobe/`, while still reading legacy NanoMan history from `.nanoman/history.json`.
- JSON handling is more robust, including `application/*+json` responses and clearer fallback messaging for very large payloads.

## Included Improvements

- Startup history renders correctly as soon as the app opens.
- Request counters stay in sync with loaded history.
- Query-only URLs such as `https://api.example.com?x=1` validate correctly.
- Dropdown behavior on Windows is more predictable.
- Public repository assets and docs were refreshed for the standalone Fuseprobe brand.

## Upgrade Notes

- Existing NanoMan users do not need to migrate history manually.
- Launch the app with `python main.py` on Windows if `py` resolves to a different Python installation than your dependency environment.
