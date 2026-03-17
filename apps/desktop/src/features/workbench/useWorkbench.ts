import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "../i18n/locale";
import {
  formatCommandError,
  formatPersistenceWarning,
} from "../i18n/messageText";
import type { SendRequestResult } from "../../lib/contracts";
import {
  type ApiTemplateKey,
  type AuthPresetKey,
  applyAuthPresetHeaders,
  getApiTemplateByKey,
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
      statusCode: 0,
      reason: "",
      durationMs: 0,
      byteCount: 0,
      contentType: "pending",
      charset: "utf-8",
      responseText: strings.hooks.idleResponseText,
      rawResponseText: "",
      responseHeaders: {},
      policyCode: "redirects_disabled",
      isBinary: false,
      truncated: false,
      redirectLocation: null,
      persistenceWarningCode: null,
    }),
    [strings.hooks.idleResponseText],
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
  const [activeTemplateKey, setActiveTemplateKey] = useState<ApiTemplateKey | null>(null);
  const [activeAuthPresetKey, setActiveAuthPresetKey] = useState<AuthPresetKey>("none");

  useEffect(() => {
    setResponse((currentResponse) => {
      const isIdleState =
        currentResponse.request.url === "" &&
        currentResponse.durationMs === 0 &&
        currentResponse.byteCount === 0 &&
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
      setPersistenceWarning(
        formatPersistenceWarning(strings, result.persistenceWarningCode),
      );
      setHistoryRevision((revision) => revision + 1);
    } catch (requestError) {
      setError(formatCommandError(strings, requestError, strings.hooks.requestFailed));
    } finally {
      requestInFlightRef.current = false;
      setIsSending(false);
    }
  }

  function applyTemplate(templateKey: ApiTemplateKey) {
    const template = getApiTemplateByKey(templateKey);
    const firstExample = template.examples[0];
    const nextMethod = firstExample?.method ?? "GET";
    const nextUrl = `${template.baseUrl}${firstExample?.path ?? ""}`;
    const authPreset = getAuthPreset(template.auth);

    setMethod(nextMethod);
    setUrl(nextUrl);
    setHeaders((currentHeaders) => applyAuthPresetHeaders(currentHeaders, authPreset));
    setActiveTemplateKey(template.key);
    setActiveAuthPresetKey(authPreset.key);
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
    activeTemplateKey,
    activeAuthPresetKey,
    applyTemplate,
    submitRequest,
  };
}
