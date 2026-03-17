import { useLocale } from "../i18n/locale";
import type { ApiTemplateKey, AuthPresetKey } from "../presets/presets";

interface RequestEditorProps {
  body: string;
  headers: string;
  isSending: boolean;
  activeTemplateKey: ApiTemplateKey | null;
  activeAuthPresetKey: AuthPresetKey;
  onBodyChange: (value: string) => void;
  onHeadersChange: (value: string) => void;
}

export default function RequestEditor({
  body,
  headers,
  isSending,
  activeTemplateKey,
  activeAuthPresetKey,
  onBodyChange,
  onHeadersChange,
}: RequestEditorProps) {
  const { strings } = useLocale();
  const localizedAuthPreset = strings.presets.auth[activeAuthPresetKey];
  const localizedTemplateName = activeTemplateKey
    ? strings.presets.templates[activeTemplateKey].name
    : null;

  return (
    <section className="panel request-panel" aria-label="request-panel">
      <div className="panel-header">
        <h2>{strings.request.title}</h2>
        <span className="panel-meta">{strings.request.meta}</span>
      </div>

      <div className="pill-row" aria-label="request-tabs">
        <span className="pill active">{strings.request.tabs.body}</span>
        <span className="pill">{strings.request.tabs.headers}</span>
        <span className="pill">{strings.request.tabs.auth}</span>
      </div>

      <div className="editor-card">
        <label className="editor-label" htmlFor="request-body">
          {strings.request.bodyLabel}
        </label>
        <textarea
          id="request-body"
          className="editor-input"
          disabled={isSending}
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder={strings.request.bodyPlaceholder}
        />
      </div>

      <div className="editor-card">
        <label className="editor-label" htmlFor="request-headers">
          {strings.request.headersLabel}
        </label>
        <textarea
          id="request-headers"
          className="editor-input editor-input-compact"
          disabled={isSending}
          value={headers}
          onChange={(event) => onHeadersChange(event.target.value)}
          placeholder={strings.request.headersPlaceholder}
        />
      </div>

      <div className="editor-card compact">
        <label className="editor-label">{strings.request.authPresetLabel}</label>
        <div className="auth-summary">
          <p className="hint-text">{localizedAuthPreset.name}</p>
          <span className="hint-badge">
            {localizedTemplateName
              ? strings.request.fromTemplate(localizedTemplateName)
              : strings.request.manualRequest}
          </span>
        </div>
        <p className="hint-text hint-text-subtle">{localizedAuthPreset.description}</p>
      </div>
    </section>
  );
}
