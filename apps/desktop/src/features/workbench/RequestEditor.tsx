interface RequestEditorProps {
  body: string;
  headers: string;
  activeTemplateName: string | null;
  activeAuthPresetName: string;
  authDescription: string;
  onBodyChange: (value: string) => void;
  onHeadersChange: (value: string) => void;
}

export default function RequestEditor({
  body,
  headers,
  activeTemplateName,
  activeAuthPresetName,
  authDescription,
  onBodyChange,
  onHeadersChange,
}: RequestEditorProps) {
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
        <label className="editor-label" htmlFor="request-body">
          Request Body
        </label>
        <textarea
          id="request-body"
          className="editor-input"
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder='{"include":["profile"]}'
        />
      </div>

      <div className="editor-card">
        <label className="editor-label" htmlFor="request-headers">
          Request Headers
        </label>
        <textarea
          id="request-headers"
          className="editor-input editor-input-compact"
          value={headers}
          onChange={(event) => onHeadersChange(event.target.value)}
          placeholder={"Accept: application/json\nX-Workspace: local-dev"}
        />
      </div>

      <div className="editor-card compact">
        <label className="editor-label">Auth Preset</label>
        <div className="auth-summary">
          <p className="hint-text">{activeAuthPresetName}</p>
          <span className="hint-badge">
            {activeTemplateName ? `from ${activeTemplateName}` : "manual request"}
          </span>
        </div>
        <p className="hint-text hint-text-subtle">{authDescription}</p>
      </div>
    </section>
  );
}
