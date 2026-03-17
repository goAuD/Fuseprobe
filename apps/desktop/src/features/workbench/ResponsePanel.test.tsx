import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ResponsePanel from "./ResponsePanel";

const BASE_RESPONSE = {
  request: {
    method: "GET",
    url: "https://example.com/users",
    body: "",
    headers: "",
  },
  statusCode: 200,
  reason: "OK",
  durationMs: 28,
  byteCount: 96,
  contentType: "application/json",
  charset: "utf-8",
  responseText: '{\n  "ok": true\n}',
  rawResponseText: '{"ok":true}',
  responseHeaders: {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": "req-42",
  },
  policyCode: "redirects_disabled" as const,
  isBinary: false,
  truncated: false,
  redirectLocation: null,
  persistenceWarningCode: null,
};

it("switches between formatted response, headers, and raw tabs", () => {
  const { container } = render(
    <ResponsePanel response={BASE_RESPONSE} isSending={false} error={null} />,
  );

  expect(screen.getByLabelText("response-panel")).toHaveTextContent('"ok": true');
  expect(container.querySelector(".json-key")).toHaveTextContent('"ok"');
  expect(container.querySelector(".json-boolean")).toHaveTextContent("true");

  fireEvent.click(screen.getByRole("button", { name: "Headers" }));
  expect(
    screen.getByText(/content-type: application\/json; charset=utf-8/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/x-request-id: req-42/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Raw" }));
  expect(screen.getByText('{"ok":true}')).toBeInTheDocument();
});

it("shows the binary placeholder in the formatted response tab", () => {
  render(
    <ResponsePanel
      response={{
        ...BASE_RESPONSE,
        contentType: "application/octet-stream",
        byteCount: 4,
        responseText: "",
        rawResponseText: "",
        isBinary: true,
      }}
      isSending={false}
      error={null}
    />,
  );

  expect(
    screen.getByText("[Binary response omitted: application/octet-stream, 4 bytes]"),
  ).toBeInTheDocument();
});
