import { invoke } from "@tauri-apps/api/core";
import type {
  HistoryEntry,
  SendRequestPayload,
  SendRequestResult,
} from "./contracts";

export function buildSendRequestPayload(
  payload: SendRequestPayload,
): SendRequestPayload {
  return payload;
}

function buildMockResponse(payload: SendRequestPayload): SendRequestResult {
  const responseText = JSON.stringify(
    {
      request: {
        method: payload.method,
        url: payload.url,
        hasBody: payload.body.trim().length > 0,
        hasHeaders: payload.headers.trim().length > 0,
      },
      shell: "tauri-react-workbench",
      mode: "desktop-mvp",
    },
    null,
    2,
  );

  return {
    request: payload,
    statusLine: "200 OK",
    durationMs: 42,
    sizeLabel: `${new TextEncoder().encode(responseText).length} B`,
    contentType: "application/json",
    charset: "utf-8",
    responseText,
    policyNote: "redirects disabled by policy",
  };
}

export async function sendRequest(
  payload: SendRequestPayload,
): Promise<SendRequestResult> {
  const normalizedPayload = buildSendRequestPayload(payload);
  let echoedPayload = normalizedPayload;

  try {
    echoedPayload = await invoke<SendRequestPayload>("send_request", {
      payload: normalizedPayload,
    });
  } catch {
    echoedPayload = normalizedPayload;
  }

  return buildMockResponse(echoedPayload);
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    return await invoke<HistoryEntry[]>("load_history");
  } catch {
    return [];
  }
}
