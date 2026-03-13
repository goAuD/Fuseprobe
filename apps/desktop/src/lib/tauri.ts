import { invoke } from "@tauri-apps/api/core";
import type {
  HistoryEntry,
  SecuritySettings,
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
    rawResponseText: JSON.stringify(
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
      0,
    ),
    responseHeaders: {
      "content-type": "application/json; charset=utf-8",
      "x-fuseprobe-mode": "desktop-mvp",
    },
    policyNote: "redirects disabled by policy",
  };
}

export async function sendRequest(
  payload: SendRequestPayload,
): Promise<SendRequestResult> {
  const normalizedPayload = buildSendRequestPayload(payload);

  try {
    return await invoke<SendRequestResult>("send_request", {
      payload: normalizedPayload,
    });
  } catch {
    return buildMockResponse(normalizedPayload);
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    return await invoke<HistoryEntry[]>("load_history");
  } catch {
    return [];
  }
}

export async function deleteHistoryEntry(index: number): Promise<HistoryEntry[]> {
  try {
    return await invoke<HistoryEntry[]>("delete_history_entry", { index });
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<HistoryEntry[]> {
  try {
    return await invoke<HistoryEntry[]>("clear_history");
  } catch {
    return [];
  }
}

export async function loadSecuritySettings(): Promise<SecuritySettings> {
  return await invoke<SecuritySettings>("load_security_settings");
}

export async function updateSecuritySettings(
  settings: SecuritySettings,
): Promise<SecuritySettings> {
  return await invoke<SecuritySettings>("update_security_settings", { settings });
}
