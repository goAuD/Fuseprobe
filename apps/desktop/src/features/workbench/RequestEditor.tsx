import { useLocale } from "../i18n/locale";

interface RequestEditorProps {
  body: string;
  headers: string;
  isSending: boolean;
  activeTemplateName: string | null;
  activeAuthPresetName: string;
  authDescription: string;
  onBodyChange: (value: string) => void;
  onHeadersChange: (value: string) => void;
}

export default function RequestEditor({
  body,
  headers,
  isSending,
  activeTemplateName,
  activeAuthPresetName,
  authDescription,
  onBodyChange,
  onHeadersChange,
}: RequestEditorProps) {
  const { locale, strings } = useLocale();
  const localizedAuthPresetName = (
    {
      "No Auth": {
        en: "No Auth",
        de: "Keine Auth",
        hu: "Nincs auth",
      },
      "Bearer Token": {
        en: "Bearer Token",
        de: "Bearer-Token",
        hu: "Bearer token",
      },
      "Basic Auth": {
        en: "Basic Auth",
        de: "Basic Auth",
        hu: "Basic auth",
      },
      "API Key (Header)": {
        en: "API Key (Header)",
        de: "API-Schlüssel (Header)",
        hu: "API kulcs (header)",
      },
      "API Key (Authorization)": {
        en: "API Key (Authorization)",
        de: "API-Schlüssel (Authorization)",
        hu: "API kulcs (Authorization)",
      },
    } as const
  )[activeAuthPresetName]?.[locale] ?? activeAuthPresetName;
  const localizedAuthDescription = (
    {
      "No authentication": {
        en: "No authentication",
        de: "Keine Authentifizierung",
        hu: "Nincs hitelesítés",
      },
      "JWT or OAuth2 bearer token": {
        en: "JWT or OAuth2 bearer token",
        de: "JWT- oder OAuth2-Bearer-Token",
        hu: "JWT vagy OAuth2 bearer token",
      },
      "Base64 encoded username:password": {
        en: "Base64 encoded username:password",
        de: "Base64-codiertes username:password",
        hu: "Base64 kódolt username:password",
      },
      "API key in X-Api-Key header": {
        en: "API key in X-Api-Key header",
        de: "API-Schlüssel im X-Api-Key-Header",
        hu: "API kulcs az X-Api-Key headerben",
      },
      "API key in Authorization header": {
        en: "API key in Authorization header",
        de: "API-Schlüssel az Authorization-Headerben",
        hu: "API kulcs az Authorization headerben",
      },
    } as const
  )[authDescription]?.[locale] ?? authDescription;

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
          <p className="hint-text">{localizedAuthPresetName}</p>
          <span className="hint-badge">
            {activeTemplateName
              ? strings.request.fromTemplate(activeTemplateName)
              : strings.request.manualRequest}
          </span>
        </div>
        <p className="hint-text hint-text-subtle">{localizedAuthDescription}</p>
      </div>
    </section>
  );
}
