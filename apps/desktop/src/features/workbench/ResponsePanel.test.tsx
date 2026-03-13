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
  statusLine: "200 OK",
  durationMs: 28,
  sizeLabel: "96 B",
  contentType: "application/json",
  charset: "utf-8",
  responseText: '{\n  "ok": true\n}',
  rawResponseText: '{"ok":true}',
  responseHeaders: {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": "req-42",
  },
  policyNote: "redirects disabled by policy",
};

it("switches between formatted response, headers, and raw tabs", () => {
  render(<ResponsePanel response={BASE_RESPONSE} isSending={false} error={null} />);

  expect(screen.getByLabelText("response-panel")).toHaveTextContent('"ok": true');

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
        responseText: "[Binary response omitted: application/octet-stream, 4 bytes]",
        rawResponseText: "[Binary response omitted: application/octet-stream, 4 bytes]",
      }}
      isSending={false}
      error={null}
    />,
  );

  expect(
    screen.getByText("[Binary response omitted: application/octet-stream, 4 bytes]"),
  ).toBeInTheDocument();
});
