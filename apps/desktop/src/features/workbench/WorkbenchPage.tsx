import HistoryPanel from "./HistoryPanel";
import RequestEditor from "./RequestEditor";
import ResponsePanel from "./ResponsePanel";

export default function WorkbenchPage() {
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
          <button className="control method-control" type="button">
            GET
          </button>
          <div className="control url-control">https://api.example.com/users?limit=20</div>
          <button className="control send-control" type="button">
            Send
          </button>
        </div>

        <div className="meta-row">
          <span className="meta-chip">history local</span>
          <span className="meta-chip">no cloud</span>
        </div>
      </header>

      <section className="workspace-grid">
        <div className="sidebar-column">
          <RequestEditor />
          <HistoryPanel />
        </div>
        <div className="content-column">
          <ResponsePanel />
          <footer className="footer-note">
            <span className="footer-dot" />
            <span>Focused request workbench, not a generic dashboard shell.</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
