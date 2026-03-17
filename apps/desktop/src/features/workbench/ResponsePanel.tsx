import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "../i18n/locale";
import { formatByteCount } from "../i18n/messageText";
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
  const { locale, strings } = useLocale();
  const [activeTab, setActiveTab] = useState<"response" | "headers" | "raw">("response");

  useEffect(() => {
    setActiveTab("response");
  }, [response, error]);

  const statusLine = error
    ? strings.response.requestError
    : isSending
      ? strings.app.sending
      : response.statusCode === 0
        ? strings.hooks.idleStatus
        : response.reason
          ? `${response.statusCode} ${response.reason}`
          : `${response.statusCode}`;
  const responseBody = error
    ? error
    : response.isBinary
      ? strings.response.binaryResponseOmitted(
          response.contentType || "unknown",
          response.byteCount,
        )
      : buildResponseBody(strings, response);
  const responseHeaders = Object.entries(response.responseHeaders)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const parsedJson = useMemo(
    () => (!error && !response.isBinary && activeTab === "response"
      ? tryParseJsonPreview(response.contentType, response.responseText)
      : null),
    [activeTab, error, response.contentType, response.isBinary, response.responseText],
  );
  const previewText =
    activeTab === "headers"
      ? responseHeaders || strings.response.noHeadersYet
      : activeTab === "raw"
        ? error
          || buildRawResponseBody(strings, response)
          || strings.response.noRawYet
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
          <span>{formatByteCount(locale, response.byteCount)}</span>
        </div>
        <div className="meta-row">
          <span className="meta-chip">{response.contentType}</span>
          <span className="meta-chip">{response.charset}</span>
          <span className="meta-chip">{strings.response.policies[response.policyCode]}</span>
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

function buildResponseBody(strings: ReturnType<typeof useLocale>["strings"], response: SendRequestResult) {
  const segments: string[] = [];

  if (response.redirectLocation) {
    segments.push(strings.response.redirectNotFollowed(response.redirectLocation));
  }

  if (response.responseText) {
    segments.push(response.responseText);
  }

  if (response.truncated) {
    segments.push(strings.response.outputTruncated(response.byteCount));
  }

  return segments.join("\n\n");
}

function buildRawResponseBody(strings: ReturnType<typeof useLocale>["strings"], response: SendRequestResult) {
  if (response.isBinary) {
    return strings.response.binaryResponseOmitted(
      response.contentType || "unknown",
      response.byteCount,
    );
  }

  const segments: string[] = [];
  if (response.redirectLocation) {
    segments.push(strings.response.redirectNotFollowed(response.redirectLocation));
  }
  if (response.rawResponseText) {
    segments.push(response.rawResponseText);
  }

  return segments.join("\n\n");
}
