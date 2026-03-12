import {
  buildSendRequestPayload,
  clearHistory,
  deleteHistoryEntry,
} from "./tauri";

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

it("falls back to empty arrays for history mutations without a desktop bridge", async () => {
  await expect(deleteHistoryEntry(0)).resolves.toEqual([]);
  await expect(clearHistory()).resolves.toEqual([]);
});
