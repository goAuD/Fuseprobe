import "@testing-library/jest-dom/vitest";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useWorkbench } from "./useWorkbench";
import { sendRequest } from "../../lib/tauri";

vi.mock("../../lib/tauri", () => ({
  sendRequest: vi.fn(),
}));

const mockedSendRequest = vi.mocked(sendRequest);

beforeEach(() => {
  mockedSendRequest.mockReset();
});

it("starts with GET and an empty url", () => {
  const { result } = renderHook(() => useWorkbench());
  expect(result.current.method).toBe("GET");
  expect(result.current.url).toBe("");
});

it("stores the mocked response after submit", async () => {
  mockedSendRequest.mockResolvedValue({
    request: {
      method: "POST",
      url: "https://example.com",
      body: "{\"hello\":true}",
      headers: "Accept: application/json",
    },
    statusLine: "200 OK",
    durationMs: 37,
    sizeLabel: "128 B",
    contentType: "application/json",
    charset: "utf-8",
    responseText: "{\"ok\":true}",
    policyNote: "redirects disabled by policy",
  });

  const { result } = renderHook(() => useWorkbench());

  act(() => {
    result.current.setMethod("POST");
    result.current.setUrl("https://example.com");
    result.current.setBody("{\"hello\":true}");
    result.current.setHeaders("Accept: application/json");
  });

  await act(async () => {
    await result.current.submitRequest();
  });

  expect(mockedSendRequest).toHaveBeenCalledWith({
    method: "POST",
    url: "https://example.com",
    body: "{\"hello\":true}",
    headers: "Accept: application/json",
  });
  expect(result.current.response.statusLine).toBe("200 OK");
  expect(result.current.error).toBeNull();
});
