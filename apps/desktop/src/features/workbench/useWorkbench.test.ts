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
    rawResponseText: "{\"ok\":true}",
    responseHeaders: {
      "content-type": "application/json",
    },
    policyNote: "redirects disabled by policy",
    persistenceWarning:
      "Persistent history could not be saved. Session history remains available.",
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
  expect(result.current.persistenceWarning).toBe(
    "Persistent history could not be saved. Session history remains available.",
  );
  expect(result.current.historyRevision).toBe(1);
});

it("surfaces string-based request errors from the desktop bridge", async () => {
  mockedSendRequest.mockRejectedValue("Invalid or unsafe URL. Only http:// and https:// are allowed.");

  const { result } = renderHook(() => useWorkbench());

  act(() => {
    result.current.setUrl("ftp://internal.example");
  });

  await act(async () => {
    await result.current.submitRequest();
  });

  expect(result.current.error).toBe(
    "Invalid or unsafe URL. Only http:// and https:// are allowed.",
  );
});

it("applies template defaults without keeping stale auth headers", () => {
  const { result } = renderHook(() => useWorkbench());

  act(() => {
    result.current.setHeaders("Accept: application/json\nAuthorization: Bearer stale");
    result.current.applyTemplate("GitHub API");
  });

  expect(result.current.method).toBe("GET");
  expect(result.current.url).toBe("https://api.github.com/user");
  expect(result.current.headers).toBe(
    "Accept: application/json\nAuthorization: Bearer <YOUR_TOKEN>",
  );
  expect(result.current.activeTemplateName).toBe("GitHub API");
  expect(result.current.activeAuthPresetName).toBe("Bearer Token");
  expect(result.current.authDescription).toBe("JWT or OAuth2 bearer token");
});
