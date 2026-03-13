import { useLocale } from "../i18n/locale";
import { useHistory } from "../history/useHistory";
import { apiTemplateNames } from "../presets/presets";

interface HistoryPanelProps {
  refreshToken?: number;
  activeTemplateName: string | null;
  onApplyTemplate: (templateName: string) => void;
}

export default function HistoryPanel({
  refreshToken = 0,
  activeTemplateName,
  onApplyTemplate,
}: HistoryPanelProps) {
  const { strings } = useLocale();
  const { entries, isLoading, error, warning, deleteEntry, clearEntries } =
    useHistory(refreshToken);

  return (
    <aside className="panel history-panel" aria-label="history-panel">
      <div className="panel-header">
        <h2>{strings.history.title}</h2>
        <div className="history-actions">
          <span className="panel-meta">{strings.history.deviceOnly}</span>
          <button className="history-action" type="button" onClick={() => void clearEntries()}>
            {strings.history.clear}
          </button>
        </div>
      </div>

      <div className="preset-section">
        <p className="editor-label">{strings.history.templates}</p>
        <div className="template-grid">
          {apiTemplateNames.map((name) => (
            <button
              key={name}
              className={`template-chip${activeTemplateName === name ? " active" : ""}`}
              type="button"
              aria-pressed={activeTemplateName === name}
              onClick={() => onApplyTemplate(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="history-list">
        {error ? (
          <p className="history-error" role="alert">
            {error}
          </p>
        ) : warning ? (
          <p className="history-warning" role="status">
            {warning}
          </p>
        ) : isLoading ? (
          <p className="history-empty">{strings.history.loading}</p>
        ) : entries.length === 0 ? (
          <p className="history-empty">{strings.history.empty}</p>
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
                  {strings.history.remove}
                </button>
              </div>
              <span>
                {entry.status || strings.history.pending} · {Math.round(entry.elapsed)} ms · {entry.time}
              </span>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
