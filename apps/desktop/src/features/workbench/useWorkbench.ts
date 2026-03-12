import { useState } from "react";
import type { SendRequestResult } from "../../lib/contracts";
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
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Request failed.";
      setError(message);
    } finally {
      setIsSending(false);
    }
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
    submitRequest,
  };
}
