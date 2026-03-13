import { beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  buildSendRequestPayload,
  clearHistory,
  deleteHistoryEntry,
  loadHistory,
  sendRequest,
} from "./tauri";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockedInvoke.mockReset();
});

it("builds a request payload from the workbench input", () => {
  expect(
    buildSendRequestPayload({
      method: "GET",
      url: "https://example.com",
      body: "",
      headers: "",
    }),
  ).toEqual({
    method: "GET",
    url: "https://example.com",
    body: "",
    headers: "",
  });
});

it("rethrows native request failures instead of returning a mock response", async () => {
  mockedInvoke.mockRejectedValueOnce(new Error("native request failed"));

  await expect(
    sendRequest({
      method: "GET",
      url: "https://example.com",
      body: "",
      headers: "",
    }),
  ).rejects.toThrow("native request failed");
});

it("rethrows history bridge failures instead of fabricating empty state", async () => {
  mockedInvoke.mockRejectedValue(new Error("history unavailable"));

  await expect(loadHistory()).rejects.toThrow("history unavailable");
  await expect(deleteHistoryEntry(0)).rejects.toThrow("history unavailable");
  await expect(clearHistory()).rejects.toThrow("history unavailable");
});
