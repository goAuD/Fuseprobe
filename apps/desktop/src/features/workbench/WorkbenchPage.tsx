import { useEffect, useMemo, useState } from "react";
import { useLocale, type LocaleCode } from "../i18n/locale";
import ControlDropdown, { type DropdownOption } from "./ControlDropdown";
import HistoryPanel from "./HistoryPanel";
import RequestEditor from "./RequestEditor";
import ResponsePanel from "./ResponsePanel";
import { useWorkbench } from "./useWorkbench";
import SecuritySettingsPanel from "../settings/SecuritySettingsPanel";

const HTTP_METHOD_OPTIONS: readonly DropdownOption<string>[] = [
  { value: "GET", label: "GET" },
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "PATCH", label: "PATCH" },
  { value: "DELETE", label: "DELETE" },
] as const;
const LANGUAGE_OPTIONS: readonly DropdownOption<LocaleCode>[] = [
  { value: "en", label: "EN" },
  { value: "de", label: "DE" },
  { value: "hu", label: "HU" },
] as const;

function WorkbenchNotice({
  kind,
  message,
  onDismiss,
}: {
  kind: "error" | "warning";
  message: string;
  onDismiss: () => void;
}) {
  const { strings } = useLocale();

  return (
    <div
      className={kind === "error" ? "shell-alert" : "shell-warning"}
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <span>{message}</span>
      <button
        type="button"
        className="shell-notice-dismiss"
        aria-label={strings.app.dismissNotice}
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

export default function WorkbenchPage() {
  const { locale, setLocale, strings } = useLocale();
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
    persistenceWarning,
    historyRevision,
    activeTemplateName,
    activeAuthPresetName,
    authDescription,
    applyTemplate,
    submitRequest,
  } = useWorkbench();
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);

  const activeNotice = useMemo(() => {
    if (error) {
      return { kind: "error" as const, message: error };
    }

    if (persistenceWarning) {
      return { kind: "warning" as const, message: persistenceWarning };
    }

    return null;
  }, [error, persistenceWarning]);

  useEffect(() => {
    setDismissedNotice(null);
  }, [activeNotice?.kind, activeNotice?.message]);

  return (
    <main className="workbench-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <img
            alt="Fuseprobe mark"
            className="brand-mark"
            src="/fuseprobe-mark.svg"
          />
          <div>
            <p className="brand-title">Fuse<span className="brand-accent">probe</span></p>
            <p className="brand-subtitle">{strings.app.brandSubtitle}</p>
          </div>
        </div>

        <div className="requestbar">
          <ControlDropdown
            ariaLabel={strings.app.requestMethodAriaLabel}
            buttonClassName="method-control"
            disabled={isSending}
            menuClassName="method-menu"
            menuLabel={strings.app.requestMethodOptionsLabel}
            optionClassName="method-option"
            options={HTTP_METHOD_OPTIONS}
            rootClassName="method-dropdown"
            value={method}
            onChange={setMethod}
          />
          <input
            aria-label={strings.app.requestUrlAriaLabel}
            className="control url-control"
            disabled={isSending}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={strings.app.requestUrlPlaceholder}
          />
          <button
            className="control send-control"
            type="button"
            disabled={isSending}
            onClick={() => void submitRequest()}
          >
            {isSending ? strings.app.sending : strings.app.send}
          </button>
          <ControlDropdown
            ariaLabel={strings.app.interfaceLanguageLabel}
            buttonClassName="locale-control"
            menuClassName="locale-menu"
            menuLabel={strings.app.languageOptionsLabel}
            optionClassName="method-option"
            options={LANGUAGE_OPTIONS}
            rootClassName="locale-dropdown"
            value={locale}
            onChange={setLocale}
            renderValue={(option) => option.label}
          />
        </div>
      </header>

      {activeNotice && dismissedNotice !== activeNotice.message ? (
        <WorkbenchNotice
          kind={activeNotice.kind}
          message={activeNotice.message}
          onDismiss={() => setDismissedNotice(activeNotice.message)}
        />
      ) : null}

      <div className="workbench-tagline">
        <span className="tagline-dot" />
        <span>{strings.app.taglineWorkbench}</span>
        <span className="tagline-sep" aria-hidden="true">·</span>
        <span>{strings.app.taglineHistory}</span>
        <span className="tagline-sep" aria-hidden="true">·</span>
        <span>{strings.app.taglineNoCloud}</span>
        <span className="tagline-sep" aria-hidden="true">·</span>
        <span>{strings.app.taglineRustCore}</span>
      </div>

      <section className="workspace-grid">
        <div className="sidebar-column">
          <RequestEditor
            body={body}
            headers={headers}
            isSending={isSending}
            activeTemplateName={activeTemplateName}
            activeAuthPresetName={activeAuthPresetName}
            authDescription={authDescription}
            onBodyChange={setBody}
            onHeadersChange={setHeaders}
          />
        </div>
        <div className="content-column">
          <ResponsePanel response={response} isSending={isSending} error={error} />
        </div>
        <div className="aside-column">
          <SecuritySettingsPanel />
          <HistoryPanel
            refreshToken={historyRevision}
            activeTemplateName={activeTemplateName}
            onApplyTemplate={applyTemplate}
          />
        </div>
      </section>
    </main>
  );
}
