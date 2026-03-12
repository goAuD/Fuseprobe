import { useHistory } from "../history/useHistory";
import { apiTemplateNames } from "../presets/presets";

export default function HistoryPanel() {
  const { entries, isLoading } = useHistory();

  return (
    <aside className="panel history-panel" aria-label="history-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">History</p>
          <h2>History</h2>
        </div>
        <span className="panel-meta">device only</span>
      </div>

      <div className="preset-section">
        <p className="editor-label">Templates</p>
        <div className="template-grid">
          {apiTemplateNames.map((name) => (
            <button key={name} className="template-chip" type="button">
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="history-list">
        {isLoading ? (
          <p className="history-empty">Loading local history...</p>
        ) : (
          entries.map((entry) => (
            <article key={`${entry.time}-${entry.method}-${entry.url}`} className="history-item">
              <strong>
                {entry.method} {entry.url}
              </strong>
              <span>
                {entry.status || "pending"} · {Math.round(entry.elapsed)} ms · {entry.time}
              </span>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
