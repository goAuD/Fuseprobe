import { useHistory } from "../history/useHistory";
import { apiTemplateNames } from "../presets/presets";

interface HistoryPanelProps {
  refreshToken?: number;
}

export default function HistoryPanel({ refreshToken = 0 }: HistoryPanelProps) {
  const { entries, isLoading, deleteEntry, clearEntries } = useHistory(refreshToken);

  return (
    <aside className="panel history-panel" aria-label="history-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">History</p>
          <h2>History</h2>
        </div>
        <div className="history-actions">
          <span className="panel-meta">device only</span>
          <button className="history-action" type="button" onClick={() => void clearEntries()}>
            Clear
          </button>
        </div>
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
        ) : entries.length === 0 ? (
          <p className="history-empty">History is empty.</p>
        ) : (
          entries.map((entry, index) => (
            <article key={`${entry.time}-${entry.method}-${entry.url}`} className="history-item">
              <div className="history-item-row">
                <strong>
                  {entry.method} {entry.url}
                </strong>
                <button
                  className="history-delete"
                  type="button"
                  onClick={() => void deleteEntry(index)}
                >
                  Remove
                </button>
              </div>
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
