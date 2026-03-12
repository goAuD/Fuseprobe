import { invoke } from "@tauri-apps/api/core";
import type { SendRequestPayload } from "./contracts";

export function buildSendRequestPayload(
  payload: SendRequestPayload,
): SendRequestPayload {
  return payload;
}

export async function sendRequest(
  payload: SendRequestPayload,
): Promise<SendRequestPayload> {
  return invoke<SendRequestPayload>("send_request", {
    payload: buildSendRequestPayload(payload),
  });
}
