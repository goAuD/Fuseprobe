import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "../i18n/locale";
import type { SendRequestResult } from "../../lib/contracts";
import {
  applyAuthPresetHeaders,
  getApiTemplateByName,
  getAuthPreset,
} from "../presets/presets";
import { sendRequest } from "../../lib/tauri";

export function useWorkbench() {
  const { strings } = useLocale();
  const requestInFlightRef = useRef(false);
  const idleResponse = useMemo<SendRequestResult>(
    () => ({
      request: {
        method: "GET",
        url: "",
        body: "",
        headers: "",
      },
      statusLine: strings.hooks.idleStatus,
      durationMs: 0,
      sizeLabel: "0 B",
      contentType: "pending",
      charset: "utf-8",
      responseText: strings.hooks.idleResponseText,
      rawResponseText: "",
      responseHeaders: {},
      policyNote: "redirects disabled by policy",
      persistenceWarning: null,
    }),
    [strings.hooks.idleResponseText, strings.hooks.idleStatus],
  );
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [headers, setHeaders] = useState("");
  const [response, setResponse] = useState<SendRequestResult>(idleResponse);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(null);
  const [activeAuthPresetName, setActiveAuthPresetName] = useState("No Auth");
  const [authDescription, setAuthDescription] = useState("No authentication");

  useEffect(() => {
    setResponse((currentResponse) => {
      const isIdleState =
        currentResponse.request.url === "" &&
        currentResponse.durationMs === 0 &&
        currentResponse.sizeLabel === "0 B" &&
        currentResponse.contentType === "pending" &&
        currentResponse.rawResponseText === "";

      return isIdleState ? idleResponse : currentResponse;
    });
  }, [idleResponse]);

  async function submitRequest() {
    if (!url.trim()) {
      setError(strings.hooks.enterUrlBeforeSending);
      return;
    }

    if (requestInFlightRef.current) {
      setError(strings.hooks.requestAlreadyInProgress);
      return;
    }

    requestInFlightRef.current = true;
    setIsSending(true);
    setError(null);
    setPersistenceWarning(null);

    try {
      const result = await sendRequest({
        method,
        url: url.trim(),
        body,
        headers,
      });
      setError(null);
      setResponse(result);
      setPersistenceWarning(result.persistenceWarning);
      setHistoryRevision((revision) => revision + 1);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : typeof requestError === "string"
            ? requestError
            : strings.hooks.requestFailed;
      setError(message);
    } finally {
      requestInFlightRef.current = false;
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
    persistenceWarning,
    historyRevision,
    activeTemplateName,
    activeAuthPresetName,
    authDescription,
    applyTemplate,
    submitRequest,
  };
}
