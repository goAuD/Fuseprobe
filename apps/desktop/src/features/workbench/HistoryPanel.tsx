export default function HistoryPanel() {
  return (
    <aside className="panel history-panel" aria-label="history-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">History</p>
          <h2>History</h2>
        </div>
        <span className="panel-meta">device only</span>
      </div>

      <div className="history-list">
        <article className="history-item">
          <strong>GET https://api.example.com/users</strong>
          <span>200 OK · 412 ms · sanitized before persistence</span>
        </article>
        <article className="history-item">
          <strong>POST https://api.example.com/audit/events</strong>
          <span>401 Unauthorized · auth token masked</span>
        </article>
      </div>
    </aside>
  );
}
