import { buildSendRequestPayload } from "./tauri";

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
