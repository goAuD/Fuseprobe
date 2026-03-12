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
  const statusLine = error ? "Request Error" : isSending ? "Sending..." : response.statusLine;
  const responseBody = error ? error : response.responseText;

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
        <span className="pill active">Response</span>
        <span className="pill">Headers</span>
        <span className="pill">Raw</span>
      </div>

      <pre className={`response-preview${error ? " danger" : ""}`}>{responseBody}</pre>
    </section>
  );
}
