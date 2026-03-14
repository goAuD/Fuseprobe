import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "../i18n/locale";
import type { SendRequestResult } from "../../lib/contracts";

interface ResponsePanelProps {
  response: SendRequestResult;
  isSending: boolean;
  error: string | null;
}

function isJsonContentType(contentType: string) {
  return /\bjson\b/i.test(contentType);
}

function tryParseJsonPreview(contentType: string, text: string) {
  if (!isJsonContentType(contentType)) {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function renderJsonValue(value: unknown, depth = 0): ReactNode {
  const indent = "  ".repeat(depth);
  const nextIndent = "  ".repeat(depth + 1);

  if (value === null) {
    return <span className="json-null">null</span>;
  }

  if (typeof value === "string") {
    return <span className="json-string">{JSON.stringify(value)}</span>;
  }

  if (typeof value === "number") {
    return <span className="json-number">{String(value)}</span>;
  }

  if (typeof value === "boolean") {
    return <span className="json-boolean">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <>
          <span className="json-punctuation">[</span>
          <span className="json-punctuation">]</span>
        </>
      );
    }

    return (
      <>
        <span className="json-punctuation">[</span>
        {"\n"}
        {value.map((item, index) => (
          <Fragment key={`array-${depth}-${index}`}>
            {nextIndent}
            {renderJsonValue(item, depth + 1)}
            {index < value.length - 1 ? (
              <span className="json-punctuation">,</span>
            ) : null}
            {"\n"}
          </Fragment>
        ))}
        {indent}
        <span className="json-punctuation">]</span>
      </>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return (
      <>
        <span className="json-punctuation">{"{"}</span>
        <span className="json-punctuation">{"}"}</span>
      </>
    );
  }

  return (
    <>
      <span className="json-punctuation">{"{"}</span>
      {"\n"}
      {entries.map(([key, entryValue], index) => (
        <Fragment key={`object-${depth}-${key}`}>
          {nextIndent}
          <span className="json-key">{JSON.stringify(key)}</span>
          <span className="json-punctuation">: </span>
          {renderJsonValue(entryValue, depth + 1)}
          {index < entries.length - 1 ? (
            <span className="json-punctuation">,</span>
          ) : null}
          {"\n"}
        </Fragment>
      ))}
      {indent}
      <span className="json-punctuation">{"}"}</span>
    </>
  );
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
  const parsedJson = useMemo(
    () => (!error && activeTab === "response"
      ? tryParseJsonPreview(response.contentType, response.responseText)
      : null),
    [activeTab, error, response.contentType, response.responseText],
  );
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

      <pre className={`response-preview${error ? " danger" : ""}`}>
        {parsedJson !== null ? renderJsonValue(parsedJson) : previewText}
      </pre>
    </section>
  );
}
