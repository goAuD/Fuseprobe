import { useEffect, useState } from "react";
import { useLocale } from "../i18n/locale";
import type { SendRequestResult } from "../../lib/contracts";

interface ResponsePanelProps {
  response: SendRequestResult;
  isSending: boolean;
  error: string | null;
}

export default function ResponsePanel({
  response,
  isSending,
  error,
}: ResponsePanelProps) {
  const { strings } = useLocale();
  const [activeTab, setActiveTab] = useState<"response" | "headers" | "raw">("response");

  useEffect(() => {
    setActiveTab("response");
  }, [response, error]);

  const statusLine = error
    ? strings.response.requestError
    : isSending
      ? strings.app.sending
      : response.statusLine;
  const responseBody = error ? error : response.responseText;
  const responseHeaders = Object.entries(response.responseHeaders)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const previewText =
    activeTab === "headers"
      ? responseHeaders || strings.response.noHeadersYet
      : activeTab === "raw"
        ? error || response.rawResponseText || strings.response.noRawYet
        : responseBody;

  return (
    <section className="panel response-panel" aria-label="response-panel">
      <div className="panel-header">
        <h2>{strings.response.title}</h2>
        <span className="panel-meta">{strings.response.meta}</span>
      </div>

      <div className="response-toolbar">
        <div className="status-block">
          <span className={`status-badge${error ? " danger" : ""}`}>{statusLine}</span>
          <span>{isSending ? strings.response.working : `${response.durationMs} ms`}</span>
          <span>{response.sizeLabel}</span>
        </div>
        <div className="meta-row">
          <span className="meta-chip">{response.contentType}</span>
          <span className="meta-chip">{response.charset}</span>
          <span className="meta-chip">{response.policyNote}</span>
        </div>
      </div>

      <div className="pill-row" aria-label="response-tabs">
        <button
          className={`pill pill-button${activeTab === "response" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("response")}
        >
          {strings.response.tabs.response}
        </button>
        <button
          className={`pill pill-button${activeTab === "headers" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("headers")}
        >
          {strings.response.tabs.headers}
        </button>
        <button
          className={`pill pill-button${activeTab === "raw" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("raw")}
        >
          {strings.response.tabs.raw}
        </button>
      </div>

      <pre className={`response-preview${error ? " danger" : ""}`}>{previewText}</pre>
    </section>
  );
}
