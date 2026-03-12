import { useState } from "react";
import type { SendRequestResult } from "../../lib/contracts";
import {
  applyAuthPresetHeaders,
  getApiTemplateByName,
  getAuthPreset,
} from "../presets/presets";
import { sendRequest } from "../../lib/tauri";

const IDLE_RESPONSE: SendRequestResult = {
  request: {
    method: "GET",
    url: "",
    body: "",
    headers: "",
  },
  statusLine: "Idle",
  durationMs: 0,
  sizeLabel: "0 B",
  contentType: "pending",
  charset: "utf-8",
  responseText: "Send a request to preview the desktop request flow.",
  rawResponseText: "",
  responseHeaders: {},
  policyNote: "redirects disabled by policy",
};

export function useWorkbench() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState("");
  const [response, setResponse] = useState<SendRequestResult>(IDLE_RESPONSE);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);
  const [activeAuthPresetName, setActiveAuthPresetName] = useState("No Auth");
  const [authDescription, setAuthDescription] = useState("No authentication");

  async function submitRequest() {
    if (!url.trim()) {
      setError("Enter a request URL before sending.");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await sendRequest({
        method,
        url: url.trim(),
        body,
        headers,
      });
      setResponse(result);
      setHistoryRevision((revision) => revision + 1);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : typeof requestError === "string"
            ? requestError
            : "Request failed.";
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  function applyTemplate(templateName: string) {
    const template = getApiTemplateByName(templateName);
    const firstExample = template.examples[0];
    const nextMethod = firstExample?.method ?? "GET";
    const nextUrl = `${template.baseUrl}${firstExample?.path ?? ""}`;
    const authPreset = getAuthPreset(template.auth);

    setMethod(nextMethod);
    setUrl(nextUrl);
    setHeaders((currentHeaders) => applyAuthPresetHeaders(currentHeaders, authPreset));
    setActiveTemplateName(template.name);
    setActiveAuthPresetName(authPreset.name);
    setAuthDescription(authPreset.description);
  }

  return {
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
    historyRevision,
    activeTemplateName,
    activeAuthPresetName,
    authDescription,
    applyTemplate,
    submitRequest,
  };
}
