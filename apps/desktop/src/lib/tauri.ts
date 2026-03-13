import { invoke } from "@tauri-apps/api/core";
import type {
  HistoryCommandResult,
  SecuritySettings,
  SendRequestPayload,
  SendRequestResult,
} from "./contracts";

export function buildSendRequestPayload(
  payload: SendRequestPayload,
): SendRequestPayload {
  return payload;
}

export async function sendRequest(
  payload: SendRequestPayload,
): Promise<SendRequestResult> {
  const normalizedPayload = buildSendRequestPayload(payload);
  return await invoke<SendRequestResult>("send_request", {
    payload: normalizedPayload,
  });
}

export async function loadHistory(): Promise<HistoryCommandResult> {
  return await invoke<HistoryCommandResult>("load_history");
}

export async function deleteHistoryEntry(
  index: number,
): Promise<HistoryCommandResult> {
  return await invoke<HistoryCommandResult>("delete_history_entry", { index });
}

export async function clearHistory(): Promise<HistoryCommandResult> {
  return await invoke<HistoryCommandResult>("clear_history");
}

export async function loadSecuritySettings(): Promise<SecuritySettings> {
  return await invoke<SecuritySettings>("load_security_settings");
}

export async function updateSecuritySettings(
  settings: SecuritySettings,
): Promise<SecuritySettings> {
  return await invoke<SecuritySettings>("update_security_settings", { settings });
}
