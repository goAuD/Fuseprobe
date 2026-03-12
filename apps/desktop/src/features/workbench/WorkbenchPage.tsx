import HistoryPanel from "./HistoryPanel";
import RequestEditor from "./RequestEditor";
import ResponsePanel from "./ResponsePanel";
import { useWorkbench } from "./useWorkbench";

export default function WorkbenchPage() {
  const {
    method,
    setMethod,
    url,
    setUrl,
    body,
    setBody,
    headers,
    setHeaders,
    response,
    isSending,
    error,
    historyRevision,
    activeTemplateName,
    activeAuthPresetName,
    authDescription,
    applyTemplate,
    submitRequest,
  } = useWorkbench();

  return (
    <main className="workbench-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">FP</div>
          <div>
            <p className="brand-title">Fuseprobe</p>
            <p className="brand-subtitle">Offline API Client</p>
          </div>
        </div>

        <div className="requestbar">
          <select
            aria-label="Request method"
            className="control method-control"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            aria-label="Request URL"
            className="control url-control"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://api.example.com/users?limit=20"
          />
          <button
            className="control send-control"
            type="button"
            onClick={() => void submitRequest()}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>

        <div className="meta-row">
          <span className="meta-chip">history local</span>
          <span className="meta-chip">no cloud</span>
          <span className="meta-chip">rust core staged</span>
        </div>
      </header>

      <section className="workspace-grid">
        <div className="sidebar-column">
          <RequestEditor
            body={body}
            headers={headers}
            activeTemplateName={activeTemplateName}
            activeAuthPresetName={activeAuthPresetName}
            authDescription={authDescription}
            onBodyChange={setBody}
            onHeadersChange={setHeaders}
          />
          <HistoryPanel
            refreshToken={historyRevision}
            activeTemplateName={activeTemplateName}
            onApplyTemplate={applyTemplate}
          />
        </div>
        <div className="content-column">
          <ResponsePanel response={response} isSending={isSending} error={error} />
          <footer className="footer-note">
            <span className="footer-dot" />
            <span>Focused request workbench, not a generic dashboard shell.</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
