import "@testing-library/jest-dom/vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
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
    statusCode: 200,
    reason: "OK",
    durationMs: 37,
    byteCount: 128,
    contentType: "application/json",
    charset: "utf-8",
    responseText: "{\"ok\":true}",
    rawResponseText: "{\"ok\":true}",
    responseHeaders: {
      "content-type": "application/json",
    },
    policyCode: "redirects_disabled",
    isBinary: false,
    truncated: false,
    redirectLocation: null,
    persistenceWarningCode: "history_save_failed",
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
  expect(result.current.response.statusCode).toBe(200);
  expect(result.current.response.reason).toBe("OK");
  expect(result.current.error).toBeNull();
  expect(result.current.persistenceWarning).toBe(
    "Persistent history could not be saved. Session history remains available.",
  );
  expect(result.current.historyRevision).toBe(1);
});

it("surfaces string-based request errors from the desktop bridge", async () => {
  mockedSendRequest.mockRejectedValue("request_invalid_url");

  const { result } = renderHook(() => useWorkbench());

  act(() => {
    result.current.setUrl("ftp://internal.example");
  });

  await act(async () => {
    await result.current.submitRequest();
  });

  expect(result.current.error).toBe(
    "Invalid request URL.",
  );
});

it("surfaces a dedicated message for validation-time host resolution failures", async () => {
  mockedSendRequest.mockRejectedValue("request_unresolvable_host");

  const { result } = renderHook(() => useWorkbench());

  act(() => {
    result.current.setUrl("https://fuseprobe-resolution-test.invalid/api");
  });

  await act(async () => {
    await result.current.submitRequest();
  });

  expect(result.current.error).toBe(
    "The target host could not be resolved during validation.",
  );
});

it("prevents a second submit while a request is already in progress", async () => {
  let resolveRequest: ((value: SendRequestReturn) => void) | null = null;
  mockedSendRequest.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
  );

  const { result } = renderHook(() => useWorkbench());

  act(() => {
    result.current.setUrl("https://example.com");
  });

  await act(async () => {
    void result.current.submitRequest();
  });

  expect(result.current.isSending).toBe(true);

  await act(async () => {
    await result.current.submitRequest();
  });

  expect(mockedSendRequest).toHaveBeenCalledTimes(1);
  expect(result.current.error).toBe("A request is already in progress.");

  await act(async () => {
    resolveRequest?.({
      request: {
        method: "GET",
        url: "https://example.com",
        body: "",
        headers: "",
      },
      statusCode: 200,
      reason: "OK",
      durationMs: 12,
      byteCount: 42,
      contentType: "application/json",
      charset: "utf-8",
      responseText: "{\"ok\":true}",
      rawResponseText: "{\"ok\":true}",
      responseHeaders: {},
      policyCode: "redirects_disabled",
      isBinary: false,
      truncated: false,
      redirectLocation: null,
      persistenceWarningCode: null,
    });
  });

  await waitFor(() => {
    expect(result.current.isSending).toBe(false);
  });

  expect(result.current.error).toBeNull();
});

it("applies template defaults without keeping stale auth headers", () => {
  const { result } = renderHook(() => useWorkbench());

  act(() => {
    result.current.setHeaders("Accept: application/json\nAuthorization: Bearer stale");
    result.current.applyTemplate("github");
  });

  expect(result.current.method).toBe("GET");
  expect(result.current.url).toBe("https://api.github.com/user");
  expect(result.current.headers).toBe(
    "Accept: application/json\nAuthorization: Bearer <YOUR_TOKEN>",
  );
  expect(result.current.activeTemplateKey).toBe("github");
  expect(result.current.activeAuthPresetKey).toBe("bearer");
});

type SendRequestReturn = Awaited<ReturnType<typeof sendRequest>>;
