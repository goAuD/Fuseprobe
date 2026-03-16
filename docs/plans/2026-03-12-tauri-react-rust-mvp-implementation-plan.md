# Fuseprobe Tauri MVP Migration Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Replace the current Tkinter desktop shell with a Tauri + React/Vite shell backed by a Rust core, while preserving the stable request/history/safety behavior already implemented in the Python reference app.

**Architecture:** Keep the current Python app at repo root as the reference implementation. Add a Rust workspace at repo root, a reusable core crate in `crates/fuseprobe-core`, and a Tauri desktop app in `apps/desktop`. Build the Rust core first, then wire a thin Tauri command layer, then build the React workbench UI on top of that. The first release is an MVP shell, not full parity.

**Tech Stack:** Rust stable, Cargo workspace, Tauri 2, React, TypeScript, Vite, Vitest, existing Python reference app + pytest suite

**Current State:** Tasks 1 through 21 are now complete. A post-gate UI hardening pass has also landed on the desktop shell for locale-backed `en/de/hu` strings, reusable dropdowns, dismissible notice banners, and accessible confirmation behavior. The cut-over release line now exists and the legacy shell is removed. The next active work is post-cut-over release/distribution hardening so public users download a real Windows installer artifact instead of cloning and building the repository. After that, the next functional slice is completing the production localization layer for `en / de / hu`.

---

## Canonical Role

This is the canonical execution plan for the Tauri MVP migration.

Use this file for:

- task order
- exact files to touch
- test-first implementation steps
- verification commands
- commit checkpoints

Architecture, product scope, and migration decisions belong in:

- `docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md`

## Required Reading

- Design spec: `docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md`
- Roadmap: `docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md`
- Preferred UI direction: `docs/plans/2026-03-11-tauri-workbench-direction-mockup.html`
- Alternate mockup reference: `docs/plans/2026-03-11-ui-direction-mockup-react.html`

## Reference Implementation Files

These Python files are the behavior baseline and should be read before porting logic:

- `src/logic.py`
- `src/services/request_service.py`
- `src/services/history_store.py`
- `src/services/response_formatter.py`
- `src/presets.py`
- `tests/test_logic.py`
- `tests/test_request_service.py`
- `tests/test_history_store.py`
- `tests/test_response_formatter.py`
- `tests/test_ui_smoke.py`

## Relevant Skills

- `@skills/writing-plans`
- `@skills/vite`
- `@skills/vitest`
- `@skills/backend-security-coder`
- `@skills/backend-testing`

## Preflight

### Toolchain checks

Run these before touching code:

```bash
node -v
npm -v
rustc -V
cargo -V
python -m pytest tests -v
python -m ruff check src tests
```

Expected:

- Node and npm installed
- Rust toolchain available
- Python suite passes
- Ruff passes on the current reference app

### Baseline behavior capture

Before porting any logic, write a parity checklist in:

- Create: `docs/plans/2026-03-12-tauri-mvp-parity-checklist.md`

Copy the stable behaviors from the Python tests and spec into a simple checklist:

- request validation and URL rejection rules
- redirect behavior
- size-limit behavior
- binary-response fallback behavior
- history delete/clear behavior
- history redaction behavior
- response formatting behavior

This checklist will be updated during the parity pass.

---

### Task 1: Create the Rust Workspace Skeleton

**Files:**
- Create: `Cargo.toml`
- Create: `crates/fuseprobe-core/Cargo.toml`
- Create: `crates/fuseprobe-core/src/lib.rs`
- Create: `crates/fuseprobe-core/tests/core_smoke.rs`
- Modify: `.gitignore`

**Step 1: Write the failing Rust smoke test**

In `crates/fuseprobe-core/tests/core_smoke.rs`:

```rust
use fuseprobe_core::version;

#[test]
fn exposes_core_version() {
    assert!(!version().is_empty());
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test -p fuseprobe-core`

Expected: FAIL with a workspace/package error because the workspace and crate do not exist yet.

**Step 3: Create the minimal workspace and crate**

In `Cargo.toml`:

```toml
[workspace]
members = [
  "crates/fuseprobe-core",
]
resolver = "2"
```

In `crates/fuseprobe-core/Cargo.toml`:

```toml
[package]
name = "fuseprobe-core"
version = "0.1.0"
edition = "2021"

[dependencies]
```

In `crates/fuseprobe-core/src/lib.rs`:

```rust
pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
```

Update `.gitignore` with Rust artifacts if missing:

```gitignore
/target/
```

**Step 4: Run test to verify it passes**

Run: `cargo test -p fuseprobe-core`

Expected: PASS with `exposes_core_version ... ok`

**Step 5: Commit**

```bash
git add Cargo.toml crates/fuseprobe-core .gitignore
git commit -m "feat: add fuseprobe rust workspace skeleton"
```

### Task 2: Scaffold the Tauri Desktop Shell

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/app.css`
- Create: `apps/desktop/src/vite-env.d.ts`
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/src-tauri/src/lib.rs`

**Step 1: Write the failing frontend smoke test**

Create `apps/desktop/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

it("renders the Fuseprobe workbench heading", () => {
  render(<App />);
  expect(screen.getByText("Fuseprobe")).toBeInTheDocument();
  expect(screen.getByText("Offline API Client")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix apps/desktop test -- --run`

Expected: FAIL because `apps/desktop/package.json` and the frontend app do not exist yet.

**Step 3: Create the minimal Tauri + Vite shell**

In `apps/desktop/package.json`:

```json
{
  "name": "fuseprobe-desktop",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.0.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

In `apps/desktop/src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <h1>Fuseprobe</h1>
      <p>Offline API Client</p>
    </main>
  );
}
```

In `apps/desktop/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

In `apps/desktop/src-tauri/Cargo.toml`:

```toml
[package]
name = "fuseprobe-desktop"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0.0" }

[dependencies]
tauri = { version = "2.0.0" }
fuseprobe-core = { path = "../../../crates/fuseprobe-core" }
```

In `apps/desktop/src-tauri/src/main.rs`:

```rust
fn main() {
    fuseprobe_desktop::run();
}
```

In `apps/desktop/src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run Fuseprobe desktop shell");
}
```

**Step 4: Run test to verify it passes**

Run: `npm --prefix apps/desktop install`

Then run: `npm --prefix apps/desktop test -- --run`

Expected: PASS with `renders the Fuseprobe workbench heading`

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "feat: scaffold tauri desktop shell"
```

### Task 3: Port URL Validation and Redaction to Rust

**Files:**
- Create: `crates/fuseprobe-core/src/validation.rs`
- Create: `crates/fuseprobe-core/src/redaction.rs`
- Modify: `crates/fuseprobe-core/src/lib.rs`
- Create: `crates/fuseprobe-core/tests/validation_redaction.rs`
- Reference: `src/logic.py`
- Reference: `tests/test_logic.py`

**Step 1: Write the failing tests**

In `crates/fuseprobe-core/tests/validation_redaction.rs`:

```rust
use fuseprobe_core::{redact_url, validate_url};

#[test]
fn rejects_urls_with_embedded_credentials() {
    let err = validate_url("https://user:secret@example.com").unwrap_err();
    assert!(err.contains("credentials"));
}

#[test]
fn redacts_sensitive_query_values() {
    let redacted = redact_url("https://api.example.com?token=abc123&safe=yes");
    assert!(redacted.contains("token=<redacted>"));
    assert!(redacted.contains("safe=yes"));
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test -p fuseprobe-core validation_redaction`

Expected: FAIL because `validate_url` and `redact_url` do not exist yet.

**Step 3: Implement the minimal port**

In `crates/fuseprobe-core/src/validation.rs`, port the current Python URL rules:

```rust
pub fn validate_url(input: &str) -> Result<(), String> {
    if input.contains("://") && input.contains('@') {
        return Err("URL credentials are not allowed".into());
    }
    if !(input.starts_with("http://") || input.starts_with("https://")) {
        return Err("URL must start with http:// or https://".into());
    }
    Ok(())
}
```

In `crates/fuseprobe-core/src/redaction.rs`, implement a first-pass query-value masker:

```rust
pub fn redact_url(input: &str) -> String {
    ["token=", "apikey=", "api_key=", "key=", "secret="]
        .iter()
        .fold(input.to_string(), |acc, marker| {
            if let Some(index) = acc.to_lowercase().find(marker) {
                let end = acc[index..].find('&').map(|offset| index + offset).unwrap_or(acc.len());
                let start = index + marker.len();
                let mut output = acc.clone();
                output.replace_range(start..end, "<redacted>");
                output
            } else {
                acc
            }
        })
}
```

Export both from `crates/fuseprobe-core/src/lib.rs`.

**Step 4: Run test to verify it passes**

Run: `cargo test -p fuseprobe-core validation_redaction`

Expected: PASS for both tests

**Step 5: Commit**

```bash
git add crates/fuseprobe-core
git commit -m "feat: port url validation and redaction to rust core"
```

### Task 4: Port History Persistence to Rust

**Files:**
- Create: `crates/fuseprobe-core/src/history.rs`
- Modify: `crates/fuseprobe-core/src/lib.rs`
- Create: `crates/fuseprobe-core/tests/history_store.rs`
- Reference: `src/services/history_store.py`
- Reference: `tests/test_history_store.py`

**Step 1: Write the failing history tests**

In `crates/fuseprobe-core/tests/history_store.rs`:

```rust
use fuseprobe_core::{HistoryEntry, HistoryStore};

#[test]
fn clear_history_removes_all_items() {
    let mut store = HistoryStore::new();
    store.add(HistoryEntry::new("GET", "https://example.com"));
    store.clear();
    assert!(store.all().is_empty());
}

#[test]
fn invalid_history_rows_are_dropped_during_normalization() {
    let normalized = HistoryStore::normalize(vec![serde_json::json!({"broken": true})]);
    assert!(normalized.is_empty());
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test -p fuseprobe-core history_store`

Expected: FAIL because `HistoryStore` is not implemented.

**Step 3: Implement the minimal history model**

In `crates/fuseprobe-core/src/history.rs`:

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HistoryEntry {
    pub method: String,
    pub url: String,
}

impl HistoryEntry {
    pub fn new(method: &str, url: &str) -> Self {
        Self {
            method: method.to_string(),
            url: url.to_string(),
        }
    }
}

#[derive(Default)]
pub struct HistoryStore {
    entries: Vec<HistoryEntry>,
}

impl HistoryStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add(&mut self, entry: HistoryEntry) {
        self.entries.push(entry);
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }

    pub fn all(&self) -> &[HistoryEntry] {
        &self.entries
    }

    pub fn normalize(_rows: Vec<serde_json::Value>) -> Vec<HistoryEntry> {
        Vec::new()
    }
}
```

Add `serde` and `serde_json` dependencies to `crates/fuseprobe-core/Cargo.toml`.

**Step 4: Run test to verify it passes**

Run: `cargo test -p fuseprobe-core history_store`

Expected: PASS for the initial tests

**Step 5: Commit**

```bash
git add crates/fuseprobe-core
git commit -m "feat: add rust history store baseline"
```

### Task 5: Port Response Classification and Formatting

**Files:**
- Create: `crates/fuseprobe-core/src/formatting.rs`
- Modify: `crates/fuseprobe-core/src/lib.rs`
- Create: `crates/fuseprobe-core/tests/formatting.rs`
- Reference: `src/services/response_formatter.py`
- Reference: `tests/test_response_formatter.py`

**Step 1: Write the failing formatter tests**

In `crates/fuseprobe-core/tests/formatting.rs`:

```rust
use fuseprobe_core::{classify_response, BodyKind};

#[test]
fn recognizes_json_content_types_with_suffix() {
    let result = classify_response("application/problem+json", b"{\"ok\":true}");
    assert_eq!(result.kind, BodyKind::Json);
}

#[test]
fn marks_non_text_responses_as_binary() {
    let result = classify_response("application/octet-stream", &[0, 159, 146, 150]);
    assert_eq!(result.kind, BodyKind::Binary);
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test -p fuseprobe-core formatting`

Expected: FAIL because `classify_response` and `BodyKind` do not exist yet.

**Step 3: Implement the minimal formatter**

In `crates/fuseprobe-core/src/formatting.rs`:

```rust
#[derive(Debug, PartialEq, Eq)]
pub enum BodyKind {
    Json,
    Text,
    Binary,
}

pub struct FormatResult {
    pub kind: BodyKind,
}

pub fn classify_response(content_type: &str, bytes: &[u8]) -> FormatResult {
    let lowered = content_type.to_ascii_lowercase();
    if lowered.contains("json") {
        return FormatResult { kind: BodyKind::Json };
    }
    if lowered.starts_with("text/") || std::str::from_utf8(bytes).is_ok() {
        return FormatResult { kind: BodyKind::Text };
    }
    FormatResult { kind: BodyKind::Binary }
}
```

**Step 4: Run test to verify it passes**

Run: `cargo test -p fuseprobe-core formatting`

Expected: PASS

**Step 5: Commit**

```bash
git add crates/fuseprobe-core
git commit -m "feat: add rust response formatting baseline"
```

### Task 6: Port Request Execution Policy

**Files:**
- Create: `crates/fuseprobe-core/src/request.rs`
- Modify: `crates/fuseprobe-core/Cargo.toml`
- Modify: `crates/fuseprobe-core/src/lib.rs`
- Create: `crates/fuseprobe-core/tests/request_execution.rs`
- Reference: `src/services/request_service.py`
- Reference: `tests/test_request_service.py`

**Step 1: Write the failing request-policy tests**

In `crates/fuseprobe-core/tests/request_execution.rs`:

```rust
use fuseprobe_core::RequestOptions;

#[test]
fn defaults_to_no_redirect_following() {
    let options = RequestOptions::default();
    assert!(!options.follow_redirects);
}

#[test]
fn enforces_a_max_response_size() {
    let options = RequestOptions::default();
    assert_eq!(options.max_response_bytes, 2 * 1024 * 1024);
}
```

**Step 2: Run test to verify it fails**

Run: `cargo test -p fuseprobe-core request_execution`

Expected: FAIL because `RequestOptions` is not implemented.

**Step 3: Implement the baseline request configuration**

In `crates/fuseprobe-core/src/request.rs`:

```rust
pub struct RequestOptions {
    pub follow_redirects: bool,
    pub max_response_bytes: usize,
    pub timeout_seconds: u64,
}

impl Default for RequestOptions {
    fn default() -> Self {
        Self {
            follow_redirects: false,
            max_response_bytes: 2 * 1024 * 1024,
            timeout_seconds: 20,
        }
    }
}
```

Add the real HTTP client dependency after this baseline compiles:

```toml
reqwest = { version = "0.12", features = ["json", "stream", "rustls-tls"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

**Step 4: Run test to verify it passes**

Run: `cargo test -p fuseprobe-core request_execution`

Expected: PASS

**Step 5: Commit**

```bash
git add crates/fuseprobe-core
git commit -m "feat: add rust request policy baseline"
```

### Task 7: Expose Tauri Commands for the MVP Flow

**Files:**
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Create: `apps/desktop/src-tauri/src/commands/mod.rs`
- Create: `apps/desktop/src-tauri/src/commands/request.rs`
- Create: `apps/desktop/src-tauri/src/commands/history.rs`
- Create: `apps/desktop/src-tauri/src/state.rs`
- Create: `apps/desktop/src/lib/tauri.ts`
- Create: `apps/desktop/src/lib/contracts.ts`

**Step 1: Write the failing frontend bridge test**

In `apps/desktop/src/lib/tauri.test.ts`:

```ts
import { buildSendRequestPayload } from "./tauri";

it("builds a request payload from the workbench input", () => {
  expect(
    buildSendRequestPayload({
      method: "GET",
      url: "https://example.com",
      body: "",
      headers: "",
    }),
  ).toEqual({
    method: "GET",
    url: "https://example.com",
    body: "",
    headers: "",
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix apps/desktop test -- --run src/lib/tauri.test.ts`

Expected: FAIL because `buildSendRequestPayload` does not exist.

**Step 3: Implement the bridge shape**

In `apps/desktop/src/lib/contracts.ts`:

```ts
export interface SendRequestPayload {
  method: string;
  url: string;
  body: string;
  headers: string;
}
```

In `apps/desktop/src/lib/tauri.ts`:

```ts
import type { SendRequestPayload } from "./contracts";

export function buildSendRequestPayload(payload: SendRequestPayload): SendRequestPayload {
  return payload;
}
```

In `apps/desktop/src-tauri/src/lib.rs`, register empty commands first:

```rust
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::request::send_request,
            commands::history::load_history,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Fuseprobe desktop shell");
}
```

**Step 4: Run test to verify it passes**

Run: `npm --prefix apps/desktop test -- --run src/lib/tauri.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "feat: add tauri command bridge contracts"
```

### Task 8: Build the Workbench UI Skeleton

**Files:**
- Create: `apps/desktop/src/features/workbench/WorkbenchPage.tsx`
- Create: `apps/desktop/src/features/workbench/WorkbenchPage.test.tsx`
- Create: `apps/desktop/src/features/workbench/RequestEditor.tsx`
- Create: `apps/desktop/src/features/workbench/ResponsePanel.tsx`
- Create: `apps/desktop/src/features/workbench/HistoryPanel.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/app.css`

**Step 1: Write the failing UI test**

In `apps/desktop/src/features/workbench/WorkbenchPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import WorkbenchPage from "./WorkbenchPage";

it("renders request and response regions", () => {
  render(<WorkbenchPage />);
  expect(screen.getByText("Request")).toBeInTheDocument();
  expect(screen.getByText("Response")).toBeInTheDocument();
  expect(screen.getByText("History")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix apps/desktop test -- --run src/features/workbench/WorkbenchPage.test.tsx`

Expected: FAIL because `WorkbenchPage` does not exist.

**Step 3: Implement the workbench skeleton**

In `apps/desktop/src/features/workbench/WorkbenchPage.tsx`:

```tsx
export default function WorkbenchPage() {
  return (
    <div className="workbench">
      <section aria-label="request-panel">
        <h2>Request</h2>
      </section>
      <section aria-label="response-panel">
        <h2>Response</h2>
      </section>
      <aside aria-label="history-panel">
        <h2>History</h2>
      </aside>
    </div>
  );
}
```

Replace `App.tsx` body with `<WorkbenchPage />`.

**Step 4: Run test to verify it passes**

Run: `npm --prefix apps/desktop test -- --run src/features/workbench/WorkbenchPage.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "feat: add workbench ui skeleton"
```

### Task 9: Wire Real Request and Response Flow

**Files:**
- Modify: `apps/desktop/src/lib/tauri.ts`
- Modify: `apps/desktop/src/lib/contracts.ts`
- Modify: `apps/desktop/src/features/workbench/RequestEditor.tsx`
- Modify: `apps/desktop/src/features/workbench/ResponsePanel.tsx`
- Modify: `apps/desktop/src/features/workbench/WorkbenchPage.tsx`
- Create: `apps/desktop/src/features/workbench/useWorkbench.ts`
- Create: `apps/desktop/src/features/workbench/useWorkbench.test.ts`

**Step 1: Write the failing state test**

In `apps/desktop/src/features/workbench/useWorkbench.test.ts`:

```ts
import { renderHook } from "@testing-library/react";
import { useWorkbench } from "./useWorkbench";

it("starts with GET and an empty url", () => {
  const { result } = renderHook(() => useWorkbench());
  expect(result.current.method).toBe("GET");
  expect(result.current.url).toBe("");
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix apps/desktop test -- --run src/features/workbench/useWorkbench.test.ts`

Expected: FAIL because `useWorkbench` does not exist.

**Step 3: Implement the minimal workbench state**

In `apps/desktop/src/features/workbench/useWorkbench.ts`:

```ts
import { useState } from "react";

export function useWorkbench() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState("");

  return { method, setMethod, url, setUrl, body, setBody, headers, setHeaders };
}
```

Then teach `RequestEditor` and `ResponsePanel` to consume this state and the Tauri bridge.

**Step 4: Run test to verify it passes**

Run: `npm --prefix apps/desktop test -- --run src/features/workbench/useWorkbench.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "feat: wire workbench request state"
```

### Task 10: Wire History and Presets into the Shell

**Files:**
- Modify: `apps/desktop/src/features/workbench/HistoryPanel.tsx`
- Create: `apps/desktop/src/features/presets/presets.ts`
- Create: `apps/desktop/src/features/presets/presets.test.ts`
- Create: `apps/desktop/src/features/history/useHistory.ts`
- Create: `apps/desktop/src/features/history/useHistory.test.ts`
- Reference: `src/presets.py`

**Step 1: Write the failing preset test**

In `apps/desktop/src/features/presets/presets.test.ts`:

```ts
import { apiTemplateNames } from "./presets";

it("includes jsonplaceholder in the desktop preset list", () => {
  expect(apiTemplateNames).toContain("JSONPlaceholder");
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix apps/desktop test -- --run src/features/presets/presets.test.ts`

Expected: FAIL because the desktop preset module does not exist.

**Step 3: Implement the minimal preset/history layer**

In `apps/desktop/src/features/presets/presets.ts`, first hard-code the current known presets copied from `src/presets.py`:

```ts
export const apiTemplateNames = [
  "Localhost",
  "Microsoft Graph API",
  "GitHub API",
  "JSONPlaceholder",
  "HTTPBin",
  "ReqRes",
];
```

Then add `useHistory.ts` that wraps the Tauri history commands with a simple React state API.

**Step 4: Run test to verify it passes**

Run: `npm --prefix apps/desktop test -- --run src/features/presets/presets.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "feat: add desktop history and preset hooks"
```

### Task 11: Add End-to-End MVP Verification

**Files:**
- Create: `apps/desktop/src/features/workbench/Workbench.integration.test.tsx`
- Create: `docs/plans/2026-03-12-tauri-mvp-parity-checklist.md`
- Modify: `README.md`

**Step 1: Write the failing integration test**

In `apps/desktop/src/features/workbench/Workbench.integration.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import WorkbenchPage from "./WorkbenchPage";

it("shows the send action and response region together", () => {
  render(<WorkbenchPage />);
  expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  expect(screen.getByText("Response")).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm --prefix apps/desktop test -- --run src/features/workbench/Workbench.integration.test.tsx`

Expected: FAIL because the current workbench skeleton does not yet expose the tested UI affordances.

**Step 3: Implement the missing UI hooks and update the parity checklist**

- Add the `Send` button and response region labels if still missing
- Mark completed parity items in `docs/plans/2026-03-12-tauri-mvp-parity-checklist.md`
- Update `README.md` with a short “desktop migration in progress” note and where the reference implementation still lives

**Step 4: Run all current desktop tests**

Run:

```bash
npm --prefix apps/desktop test -- --run
cargo test
python -m pytest tests -v
```

Expected:

- frontend tests pass
- Rust tests pass
- Python reference suite still passes

**Step 5: Commit**

```bash
git add apps/desktop crates/fuseprobe-core docs/plans README.md
git commit -m "test: verify tauri mvp shell against reference baseline"
```

### Task 12: Final MVP Gate Before Broader UI Polish

**Files:**
- Modify: `docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md`
- Modify: `docs/plans/2026-03-12-tauri-mvp-parity-checklist.md`
- Modify: `CHANGELOG.md`

**Step 1: Write the release-gate checklist**

Add a final checklist to `docs/plans/2026-03-12-tauri-mvp-parity-checklist.md`:

```md
- [ ] request execution works end-to-end
- [ ] redirect policy matches Python baseline
- [ ] history redaction matches Python baseline
- [ ] history delete and clear work
- [ ] binary responses do not render as text
- [ ] JSON responses render in the formatted response view
```

**Step 2: Run the full verification suite**

Run:

```bash
cargo test
npm --prefix apps/desktop test -- --run
python -m pytest tests -v
python -m ruff check src tests
```

Expected: all commands pass

**Step 3: Update the design and changelog docs**

- mark the migration plan as in progress in `docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md`
- add an `Unreleased` changelog entry in `CHANGELOG.md` for the Tauri MVP migration work

**Step 4: Commit**

```bash
git add docs/plans CHANGELOG.md README.md
git commit -m "docs: record tauri mvp migration status"
```

## Notes for the Implementer

- Do not delete the Python app during the MVP phase.
- Do not move the current Python files out of the repo root yet.
- Prefer parity and stability over feature growth.
- Keep the first Rust implementation explicit and boring.
- If a behavior is ambiguous, compare against the Python tests before deciding.

---

## Post-MVP Security Hardening Gate

This is now the first-priority workstream.

Reason:

- the new shell is functionally credible
- the Tauri trust boundary is now the highest-risk surface
- packaging should stay blocked until these hardening tasks are complete
- the Python/Tkinter reference app should remain in the repo only until this gate and the packaging cut-over are done

Security decisions already approved:

- deny local, private, link-local, and metadata targets by default
- allow those targets only behind an explicit persisted `Unsafe mode / Local targets` setting
- require an explicit confirmation before enabling that setting
- keep history persistence off by default
- require an explicit confirmation before enabling history persistence
- remove fail-open frontend mock behavior from the shipped desktop shell
- document these defaults in user-facing docs as intentional security design choices

### Task 13: Add Persisted Desktop Security Settings

Status: Completed on 2026-03-13.

**Files:**
- Create: `crates/fuseprobe-core/src/settings.rs`
- Modify: `crates/fuseprobe-core/src/lib.rs`
- Create: `crates/fuseprobe-core/tests/settings_store.rs`
- Create: `apps/desktop/src-tauri/src/commands/settings.rs`
- Modify: `apps/desktop/src-tauri/src/commands/mod.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src-tauri/src/state.rs`
- Modify: `apps/desktop/src/lib/contracts.ts`
- Modify: `apps/desktop/src/lib/tauri.ts`
- Create: `apps/desktop/src/features/settings/useSecuritySettings.ts`
- Create: `apps/desktop/src/features/settings/useSecuritySettings.test.ts`

**Step 1: Write the failing settings tests**

In `crates/fuseprobe-core/tests/settings_store.rs`:

```rust
use fuseprobe_core::SecuritySettings;

#[test]
fn defaults_to_safe_settings() {
    let settings = SecuritySettings::default();
    assert!(!settings.allow_unsafe_targets);
    assert!(!settings.persist_history);
}
```

In `apps/desktop/src/features/settings/useSecuritySettings.test.ts`:

```ts
import { renderHook } from "@testing-library/react";
import { useSecuritySettings } from "./useSecuritySettings";

it("starts with security-first defaults", async () => {
  const { result } = renderHook(() => useSecuritySettings());
  expect(result.current.settings.allowUnsafeTargets).toBe(false);
  expect(result.current.settings.persistHistory).toBe(false);
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cargo test -p fuseprobe-core settings_store
npm --prefix apps/desktop test -- --run src/features/settings/useSecuritySettings.test.ts
```

Expected: FAIL because the settings model and bridge do not exist yet.

**Step 3: Implement the minimal persisted settings model**

In `crates/fuseprobe-core/src/settings.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SecuritySettings {
    pub allow_unsafe_targets: bool,
    pub persist_history: bool,
}

impl Default for SecuritySettings {
    fn default() -> Self {
        Self {
            allow_unsafe_targets: false,
            persist_history: false,
        }
    }
}
```

Load and save this through the Tauri state layer, and expose:

- `load_security_settings`
- `update_security_settings`

The frontend hook should become the single source of truth for reading and updating these settings.

**Step 4: Run tests to verify they pass**

Run:

```bash
cargo test -p fuseprobe-core settings_store
npm --prefix apps/desktop test -- --run src/features/settings/useSecuritySettings.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add crates/fuseprobe-core apps/desktop
git commit -m "feat: add persisted desktop security settings"
```

### Task 14: Remove Fail-Open Frontend Fallbacks

Status: Completed on 2026-03-13.

**Files:**
- Modify: `apps/desktop/src/lib/tauri.ts`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.ts`
- Modify: `apps/desktop/src/features/history/useHistory.ts`
- Modify: `apps/desktop/src/features/workbench/WorkbenchPage.tsx`
- Modify: `apps/desktop/src/lib/tauri.test.ts`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.test.ts`
- Modify: `apps/desktop/src/features/history/useHistory.test.ts`

**Step 1: Write the failing bridge tests**

Add tests that assert:

- `sendRequest(...)` rejects if the Tauri command rejects
- `loadHistory()` rejects instead of returning a silent empty array
- the workbench and history hooks surface a visible error state instead of fabricating success

Example expectation in `apps/desktop/src/lib/tauri.test.ts`:

```ts
it("rethrows native request failures instead of returning a mock response", async () => {
  vi.mocked(invoke).mockRejectedValueOnce(new Error("native request failed"));
  await expect(
    sendRequest({ method: "GET", url: "https://example.com", body: "", headers: "" }),
  ).rejects.toThrow("native request failed");
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/desktop test -- --run src/lib/tauri.test.ts src/features/workbench/useWorkbench.test.ts src/features/history/useHistory.test.ts
```

Expected: FAIL because the current bridge catches all errors and returns fake success or empty data.

**Step 3: Remove the fallback behavior**

- Delete `buildMockResponse(...)` from `apps/desktop/src/lib/tauri.ts`
- Re-throw native command failures from all bridge functions
- Add explicit error state in the workbench and history hooks
- Render a visible inline error panel in `WorkbenchPage.tsx`

The shipped desktop shell must fail closed.

**Step 4: Run tests to verify they pass**

Run:

```bash
npm --prefix apps/desktop test -- --run src/lib/tauri.test.ts src/features/workbench/useWorkbench.test.ts src/features/history/useHistory.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "fix: remove fail-open desktop bridge fallbacks"
```

### Task 15: Enforce Deny-By-Default Local and Private Target Policy

Status: Completed on 2026-03-13.

**Files:**
- Create: `crates/fuseprobe-core/src/network_policy.rs`
- Modify: `crates/fuseprobe-core/src/validation.rs`
- Modify: `crates/fuseprobe-core/src/request.rs`
- Modify: `crates/fuseprobe-core/src/lib.rs`
- Modify: `crates/fuseprobe-core/tests/validation_redaction.rs`
- Modify: `crates/fuseprobe-core/tests/request_execution.rs`
- Modify: `apps/desktop/src-tauri/src/commands/request.rs`

**Step 1: Write the failing policy tests**

Add tests for these cases:

- `http://127.0.0.1:8000` is rejected by default
- `http://localhost:3000` is rejected by default
- `http://169.254.169.254/latest/meta-data/` is rejected by default
- the same targets are allowed when `allow_unsafe_targets` is true
- redirects remain blocked if the redirect target resolves to a forbidden local/private destination

Example:

```rust
#[test]
fn rejects_loopback_targets_by_default() {
    let err = validate_url("http://127.0.0.1:8000").unwrap_err();
    assert!(err.contains("Unsafe mode"));
}
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cargo test -p fuseprobe-core validation_redaction
cargo test -p fuseprobe-core request_execution
```

Expected: FAIL because loopback and private targets are currently allowed.

**Step 3: Implement the policy gate**

Create `crates/fuseprobe-core/src/network_policy.rs` with:

- IP classification for loopback, private, link-local, unspecified, and reserved ranges
- hostname classification for `localhost`
- explicit metadata endpoint handling for `169.254.169.254`

Extend `RequestOptions` with:

```rust
pub struct RequestOptions {
    pub follow_redirects: bool,
    pub max_response_bytes: usize,
    pub timeout_seconds: u64,
    pub allow_unsafe_targets: bool,
}
```

When `allow_unsafe_targets` is `false`, reject those targets with a user-facing message that points to the `Unsafe mode / Local targets` setting.

**Step 4: Run tests to verify they pass**

Run:

```bash
cargo test -p fuseprobe-core validation_redaction
cargo test -p fuseprobe-core request_execution
```

Expected: PASS

**Step 5: Commit**

```bash
git add crates/fuseprobe-core apps/desktop/src-tauri
git commit -m "feat: enforce deny-by-default target policy"
```

### Task 16: Make History Persistence Opt-In and Tighten URL Redaction

Status: Completed on 2026-03-13.

**Files:**
- Modify: `crates/fuseprobe-core/src/redaction.rs`
- Modify: `crates/fuseprobe-core/src/history.rs`
- Modify: `crates/fuseprobe-core/tests/history_store.rs`
- Modify: `crates/fuseprobe-core/tests/validation_redaction.rs`
- Modify: `apps/desktop/src-tauri/src/commands/request.rs`
- Modify: `apps/desktop/src-tauri/src/commands/history.rs`
- Modify: `apps/desktop/src/features/history/useHistory.ts`
- Modify: `apps/desktop/src/features/history/useHistory.test.ts`

**Step 1: Write the failing tests**

Add tests for:

- request execution does not persist history when `persist_history` is `false`
- history persistence only starts after the setting is enabled
- persisted URLs strip fragments
- persisted URLs redact every query value, not only a small sensitive-key list

Example:

```rust
#[test]
fn redacts_all_query_values_for_history() {
    let redacted = redact_url("https://api.example.com/items?page=2&token=secret");
    assert!(redacted.contains("page=%2A%2A%2A"));
    assert!(redacted.contains("token=%2A%2A%2A"));
}
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cargo test -p fuseprobe-core history_store
cargo test -p fuseprobe-core validation_redaction
npm --prefix apps/desktop test -- --run src/features/history/useHistory.test.ts
```

Expected: FAIL because history persists unconditionally and redaction is still key-list based.

**Step 3: Implement the secure history policy**

- gate persistence in the Tauri commands using `SecuritySettings.persist_history`
- keep in-memory history visible for the current session even when persistence is off
- strip URL fragments before persistence
- replace every stored query value with `***`
- keep request bodies and headers out of persisted history as before

Do not add a permissive “store full URLs” mode.

**Step 4: Run tests to verify they pass**

Run:

```bash
cargo test -p fuseprobe-core history_store
cargo test -p fuseprobe-core validation_redaction
npm --prefix apps/desktop test -- --run src/features/history/useHistory.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add crates/fuseprobe-core apps/desktop
git commit -m "feat: make history persistence opt-in"
```

### Task 17: Harden Persistence Paths and Surface Save/Load Errors

Status: Completed on 2026-03-13.

**Files:**
- Create: `apps/desktop/src-tauri/src/paths.rs`
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/src/state.rs`
- Modify: `apps/desktop/src-tauri/src/commands/request.rs`
- Modify: `apps/desktop/src-tauri/src/commands/history.rs`
- Modify: `apps/desktop/src/lib/contracts.ts`
- Modify: `apps/desktop/src/lib/tauri.ts`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.ts`
- Modify: `apps/desktop/src/features/history/useHistory.ts`

**Step 1: Write the failing path/error tests**

Add Rust tests that assert:

- config files resolve under the OS config directory, not the process current directory
- save failures are returned as errors instead of being ignored

Expected cases:

- unwritable settings/history path returns an error
- desktop hooks expose that error instead of silently swallowing it

**Step 2: Run tests to verify they fail**

Run:

```bash
cargo test -p fuseprobe-desktop
npm --prefix apps/desktop test -- --run src/features/workbench/useWorkbench.test.ts src/features/history/useHistory.test.ts
```

Expected: FAIL because save errors are currently discarded and config resolution still uses env-based fallbacks.

**Step 3: Implement explicit path resolution and error propagation**

- move desktop path logic into `apps/desktop/src-tauri/src/paths.rs`
- replace `HOME` / `USERPROFILE` probing and current-directory fallback with `dirs::config_dir()`
- create a deterministic Fuseprobe app folder under the config directory
- propagate `save_to_file(...)` and `load_from_files(...)` failures back through command results
- teach the React shell to render a non-secret-bearing persistence warning when this happens

**Step 4: Run tests to verify they pass**

Run:

```bash
cargo test -p fuseprobe-desktop
npm --prefix apps/desktop test -- --run src/features/workbench/useWorkbench.test.ts src/features/history/useHistory.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "fix: harden desktop persistence paths and errors"
```

### Task 18: Reinstate Tauri CSP and Shrink Capability Scope

Status: Completed on 2026-03-13.

**Files:**
- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Modify: `apps/desktop/src-tauri/capabilities/default.json`
- Reference: `apps/desktop/src-tauri/gen/schemas/desktop-schema.json`
- Modify: `apps/desktop/src/App.test.tsx` if startup behavior changes

**Step 1: Add a failing config regression check**

Create a small config assertion test or script that fails if:

- `csp` is `null`
- `core:default` remains in the main capability file

If you prefer a test, place it in `apps/desktop/src-tauri/tests/security_config.rs` and read the JSON files there.

**Step 2: Run the check to verify it fails**

Run:

```bash
cargo test -p fuseprobe-desktop security_config
```

Expected: FAIL because the current config still uses `csp: null` and `core:default`.

**Step 3: Tighten the desktop boundary**

- replace `csp: null` with a strict production CSP for the bundled frontend
- keep dev convenience only in dev mode, not in shipped config
- remove `core:default` from `capabilities/default.json`
- add back only the minimum capability entries needed for the single main window and custom command invocation
- document each retained permission with a short justification comment if the file format allows it

Use `apps/desktop/src-tauri/gen/schemas/desktop-schema.json` as the authority when selecting exact permission names.

**Step 4: Verify the shell still starts**

Run:

```bash
cargo test -p fuseprobe-desktop security_config
cargo check -p fuseprobe-desktop
npm --prefix apps/desktop run build
npm --prefix apps/desktop run tauri dev
```

Expected:

- config regression test passes
- desktop crate still compiles
- frontend build still passes
- desktop shell opens and commands still work

**Step 5: Commit**

```bash
git add apps/desktop
git commit -m "hardening: tighten tauri csp and capabilities"
```

### Task 19: Add Request Input Ceilings and Single-Flight Backpressure

Status: Completed on 2026-03-13.

**Files:**
- Modify: `crates/fuseprobe-core/src/request.rs`
- Modify: `crates/fuseprobe-core/tests/request_execution.rs`
- Modify: `apps/desktop/src-tauri/src/state.rs`
- Modify: `apps/desktop/src-tauri/src/commands/request.rs`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.ts`
- Modify: `apps/desktop/src/features/workbench/useWorkbench.test.ts`
- Modify: `apps/desktop/src/features/workbench/RequestEditor.tsx`

**Step 1: Write the failing limit tests**

Add tests that assert:

- oversized request bodies are rejected before network execution
- oversized header blocks are rejected before header parsing
- a second `send_request` call while one is already active returns a controlled “request already in progress” error

Suggested initial limits:

- body text: `256 KiB`
- header text: `32 KiB`
- active request slots: `1`

**Step 2: Run tests to verify they fail**

Run:

```bash
cargo test -p fuseprobe-core request_execution
npm --prefix apps/desktop test -- --run src/features/workbench/useWorkbench.test.ts
```

Expected: FAIL because the current path accepts arbitrarily large strings and does not guard concurrent sends.

**Step 3: Implement the hard limits**

- add input-size validation in the Rust request layer before parsing or dispatch
- add a `Semaphore` or single-flight guard to `AppState`
- return a deterministic error when the guard is already held
- disable the `Send` action in the workbench UI while a request is in flight

Do not silently queue unbounded desktop requests.

**Step 4: Run tests to verify they pass**

Run:

```bash
cargo test -p fuseprobe-core request_execution
npm --prefix apps/desktop test -- --run src/features/workbench/useWorkbench.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add crates/fuseprobe-core apps/desktop
git commit -m "hardening: add request ceilings and backpressure"
```

### Task 20: Add Security Toggles, Confirmations, and User-Facing Docs

Status: Completed on 2026-03-13.

**Files:**
- Create: `apps/desktop/src/features/settings/SecuritySettingsPanel.tsx`
- Create: `apps/desktop/src/features/settings/SecuritySettingsPanel.test.tsx`
- Modify: `apps/desktop/src/features/workbench/WorkbenchPage.tsx`
- Modify: `apps/desktop/src/app.css`
- Modify: `README.md`
- Create: `docs/usage-and-security.md`
- Modify: `docs/plans/2026-03-11-tauri-react-rust-platform-migration-design.md`
- Modify: `docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md`
- Modify: `CHANGELOG.md`

**Step 1: Write the failing UI tests**

Add tests that assert:

- enabling `Unsafe mode / Local targets` prompts for confirmation
- enabling `History persistence` prompts for confirmation
- both toggles render visible warning copy or tooltip text

**Step 2: Run tests to verify they fail**

Run:

```bash
npm --prefix apps/desktop test -- --run src/features/settings/SecuritySettingsPanel.test.tsx
```

Expected: FAIL because the security settings panel does not exist yet.

**Step 3: Implement the security UX**

- add a visible settings section to the desktop shell
- add a hover/focus warning affordance for each risky toggle
- require a confirmation step before changing each setting from `false` to `true`
- store the final setting through the persisted settings command layer

Also add user-facing docs:

- `README.md`: short security defaults section
- `docs/usage-and-security.md`: concise public explanation of
  - why local/private targets are blocked by default
  - what `Unsafe mode / Local targets` does
  - why history persistence is off by default
  - what data history does and does not store when enabled

Do not put internal-only threat-model detail in the user doc.

**Step 4: Run the verification suite**

Run:

```bash
npm --prefix apps/desktop test -- --run
npm --prefix apps/desktop run build
cargo test
cargo check -p fuseprobe-desktop
python -m pytest tests -q
python -m ruff check src tests
```

Expected: all commands pass

**Step 5: Commit**

```bash
git add apps/desktop docs README.md CHANGELOG.md
git commit -m "docs: add desktop security controls and user guidance"
```

### Task 21: Packaging Gate and Legacy Removal Prep

Status: Completed on 2026-03-14.

This task stays blocked until Tasks 13 through 20 are complete.

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Delete later: Python/Tkinter desktop shell files after the Tauri release candidate is accepted

**Checklist:**

- [x] desktop security hardening tasks are green
- [x] user-facing docs for security defaults exist
- [x] packaged Tauri build has been verified for the current Windows release-candidate path
- [x] Python/Tkinter shell is no longer needed as a fallback

Follow-through completed:

- version metadata moved to the canonical desktop/Rust release line
- public docs and release notes were rewritten around the Tauri shell
- legacy Python/Tkinter desktop shell files were removed from the mainline repository

Only after that should the repo remove the legacy Python/Tkinter desktop shell to reduce attack surface.

---

## Post-Cut-Over Execution Track

The Tauri MVP migration is functionally complete. The next execution track is public distribution hardening for the source-only repository.

Goals:

- make GitHub Releases the canonical end-user install path
- publish a Windows NSIS installer asset on tagged releases
- stop implying that public users should clone and build from source
- keep the workflow structure ready for future Linux/macOS expansion without enabling those publish targets yet
- preserve the existing developer source-build path separately from the public install path

Approved follow-on work after this distribution track:

- complete the production localization pass for `en / de / hu`

Distribution sprint exit condition:

- the release workflow exists
- Windows release assets are the canonical public install path in docs
- maintainers have a minimal release-asset verification checklist

### Task 22: Add Windows Release Publish Workflow

**Files:**
- Create: `.github/workflows/release-desktop.yml`
- Reference: `apps/desktop/package.json`
- Reference: `apps/desktop/src-tauri/tauri.conf.json`
- Reference: `.github/workflows/codeql.yml`

**Step 1: Write the failing workflow shape review**

Before writing YAML, verify that no release workflow exists yet:

```bash
Get-ChildItem .github/workflows
```

Expected:

- only `codeql.yml` exists
- no Windows release publish workflow exists yet

This is the intentional failing baseline for the distribution sprint.

**Step 2: Create the Windows release workflow**

Create `.github/workflows/release-desktop.yml` with this structure:

```yaml
name: Release Desktop

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-windows:
    name: Build Windows Installer
    runs-on: windows-latest
    timeout-minutes: 60
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: windows-x64
            artifact_name: fuseprobe-windows-x64
            bundle_glob: target/release/bundle/nsis/*-setup.exe

    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: apps/desktop/package-lock.json

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install frontend dependencies
        run: npm --prefix apps/desktop ci

      - name: Run frontend tests
        run: npm --prefix apps/desktop test -- --run

      - name: Run Rust tests
        run: cargo test

      - name: Build desktop installer
        run: npm --prefix apps/desktop run tauri:build

      - name: Upload workflow artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact_name }}
          path: ${{ matrix.bundle_glob }}

      - name: Upload release asset
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: ${{ matrix.bundle_glob }}
```

Design constraints for this workflow:

- release builds happen on tags, not every `main` push
- `workflow_dispatch` is allowed for manual validation
- Windows is the only active publish target
- the matrix shape should stay ready for future Linux/macOS expansion
- upload both a workflow artifact and a release asset for tagged builds

**Step 3: Verify the workflow file locally**

Run:

```bash
Get-Content .github/workflows/release-desktop.yml
```

Expected:

- trigger is tag/release oriented
- no `main` push build job exists
- Windows installer upload path points at `target/release/bundle/nsis/*-setup.exe`

**Step 4: Commit**

```bash
git add .github/workflows/release-desktop.yml
git commit -m "ci: add Windows desktop release workflow"
```

### Task 23: Document GitHub Release as the Canonical Install Path

**Files:**
- Modify: `README.md`
- Modify: `docs/releases/release-v3.0.1.md`
- Modify: `docs/releases/release-v3.0.0.md`
- Modify: `CHANGELOG.md`

**Step 1: Write the failing docs review**

Review the current README and release notes for this anti-pattern:

- source-build instructions appear before installer download guidance
- the public user path is not clearly separated from the developer path

Expected current failure:

- the README still reads primarily like a source-build document instead of a public app download document

**Step 2: Reframe the public docs**

Update `README.md` so the top install flow is:

1. `Download for Windows`
2. `Build from source`

Required README changes:

- add a short `Download for Windows` section near the top
- point it to the GitHub Releases page
- clearly label source builds as a developer workflow
- keep the Windows prereq and troubleshooting notes, but move them under the source-build path
- keep the existing security and feature sections intact

In `docs/releases/release-v3.0.0.md` and `docs/releases/release-v3.0.1.md`, add a short install note that the intended Windows delivery path is the NSIS `*-setup.exe` release asset, not a raw repo clone.

In `CHANGELOG.md`, add an `Unreleased` entry noting that public documentation now treats release assets as the canonical install path.

**Step 3: Verify the docs layout**

Run:

```bash
Get-Content README.md
Get-Content docs/releases/release-v3.0.0.md
Get-Content docs/releases/release-v3.0.1.md
```

Expected:

- public download path appears before source build
- source build is clearly marked as developer-oriented
- release notes mention the setup executable as the intended Windows asset

**Step 4: Commit**

```bash
git add README.md docs/releases/release-v3.0.0.md docs/releases/release-v3.0.1.md CHANGELOG.md
git commit -m "docs: prioritize Windows release installer path"
```

### Task 24: Add Release Verification Notes for Maintainers

**Files:**
- Modify: `docs/releases/release-v3.0.1.md`
- Modify: `docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md`
- Modify: `docs/plans/2026-03-12-tauri-mvp-parity-checklist.md`

**Step 1: Write the failing maintainer checklist review**

Check whether the repo currently tells a maintainer how to verify a real published Windows release artifact.

Expected current failure:

- release verification is documented for local `tauri build`
- release verification is not yet documented for downloaded GitHub release assets

**Step 2: Add maintainer-facing verification notes**

Update the docs with a concise maintainer checklist that covers:

- confirm the GitHub Release contains the NSIS `*-setup.exe`
- download the setup asset on a clean Windows machine
- install and launch from the installed shortcut/start menu entry
- verify the app starts without opening a console window
- verify the release asset path matches the versioned tag

Keep this maintainer-oriented. Do not turn it into a broad release playbook.

**Step 3: Verify the updated release notes and roadmap**

Run:

```bash
Get-Content docs/releases/release-v3.0.1.md
Get-Content docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md
Get-Content docs/plans/2026-03-12-tauri-mvp-parity-checklist.md
```

Expected:

- release verification now includes downloaded asset validation, not only local builds
- roadmap reflects that public distribution hardening is the active post-cut-over slice

**Step 4: Commit**

```bash
git add docs/releases/release-v3.0.1.md docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md docs/plans/2026-03-12-tauri-mvp-parity-checklist.md
git commit -m "docs: add release asset verification notes"
```

### Task 25: Prepare the Next Functional Slice Boundary

**Files:**
- Modify: `docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md`
- Modify: `docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md`

**Step 1: Record the exit condition for the distribution sprint**

Add a short checkpoint note that this sprint is complete only when:

- the release workflow exists
- Windows release assets are the canonical public install path in docs
- maintainers have a minimal release-asset verification checklist

Also record the next slice explicitly:

- production localization completion for `en / de / hu`

**Step 2: Verify the plan boundary**

Run:

```bash
Get-Content docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md
Get-Content docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md
```

Expected:

- the release/distribution sprint has a clear done-condition
- localization is recorded as next, but not mixed into this sprint

**Step 3: Commit**

```bash
git add docs/plans/2026-03-12-tauri-react-rust-mvp-implementation-plan.md docs/plans/2026-03-10-hardening-and-architecture-roadmap-design.md
git commit -m "docs: record post-distribution localization boundary"
```
