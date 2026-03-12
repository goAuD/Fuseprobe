export default function RequestEditor() {
  return (
    <section className="panel request-panel" aria-label="request-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Request</p>
          <h2>Request</h2>
        </div>
        <span className="panel-meta">body · headers · auth</span>
      </div>

      <div className="pill-row" aria-label="request-tabs">
        <span className="pill active">Body</span>
        <span className="pill">Headers</span>
        <span className="pill">Auth</span>
      </div>

      <div className="editor-card">
        <label className="editor-label">Request Body</label>
        <pre className="editor-preview">{`{\n  "include": ["profile"],\n  "active": true\n}`}</pre>
      </div>

      <div className="editor-card">
        <label className="editor-label">Request Headers</label>
        <pre className="editor-preview">{`Accept: application/json\nX-Workspace: local-dev`}</pre>
      </div>

      <div className="editor-card compact">
        <label className="editor-label">Auth Preset</label>
        <p className="hint-text">Bearer Token · redacted in history and errors</p>
      </div>
    </section>
  );
}
