import { useEffect, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"response" | "headers" | "raw">("response");

  useEffect(() => {
    setActiveTab("response");
  }, [response, error]);

  const statusLine = error ? "Request Error" : isSending ? "Sending..." : response.statusLine;
  const responseBody = error ? error : response.responseText;
  const responseHeaders = Object.entries(response.responseHeaders)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const previewText =
    activeTab === "headers"
      ? responseHeaders || "No response headers yet."
      : activeTab === "raw"
        ? error || response.rawResponseText || "No raw response yet."
        : responseBody;

  return (
    <section className="panel response-panel" aria-label="response-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Response</p>
          <h2>Response</h2>
        </div>
        <span className="panel-meta">formatted view first, raw when needed</span>
      </div>

      <div className="response-toolbar">
        <div className="status-block">
          <span className={`status-badge${error ? " danger" : ""}`}>{statusLine}</span>
          <span>{isSending ? "working..." : `${response.durationMs} ms`}</span>
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
          Response
        </button>
        <button
          className={`pill pill-button${activeTab === "headers" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("headers")}
        >
          Headers
        </button>
        <button
          className={`pill pill-button${activeTab === "raw" ? " active" : ""}`}
          type="button"
          onClick={() => setActiveTab("raw")}
        >
          Raw
        </button>
      </div>

      <pre className={`response-preview${error ? " danger" : ""}`}>{previewText}</pre>
    </section>
  );
}
