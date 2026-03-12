export default function ResponsePanel() {
  return (
    <section className="panel response-panel" aria-label="response-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Response</p>
          <h2>Response</h2>
        </div>
        <span className="panel-meta">formatted view first, raw when needed</span>
      </div>

      <div className="response-toolbar">
        <div className="status-block">
          <span className="status-badge">200 OK</span>
          <span>412 ms</span>
          <span>3.2 KB</span>
        </div>
        <div className="meta-row">
          <span className="meta-chip">application/json</span>
          <span className="meta-chip">utf-8</span>
          <span className="meta-chip">no redirects</span>
        </div>
      </div>

      <div className="pill-row" aria-label="response-tabs">
        <span className="pill active">Response</span>
        <span className="pill">Headers</span>
        <span className="pill">Raw</span>
      </div>

      <pre className="response-preview">{`{\n  "users": [\n    {\n      "id": 101,\n      "email": "dana@example.com",\n      "active": true\n    }\n  ]\n}`}</pre>
    </section>
  );
}
