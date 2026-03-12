import {
  apiTemplateNames,
  applyAuthPresetHeaders,
  getApiTemplateByName,
  getAuthPreset,
} from "./presets";

it("includes jsonplaceholder in the desktop preset list", () => {
  expect(apiTemplateNames).toContain("JSONPlaceholder");
});

it("returns the GitHub API template with bearer auth", () => {
  const template = getApiTemplateByName("GitHub API");
  expect(template.baseUrl).toBe("https://api.github.com");
  expect(template.auth).toBe("bearer");
  expect(template.examples[0]?.path).toBe("/user");
});

it("merges auth preset headers without keeping stale auth keys", () => {
  const headers = applyAuthPresetHeaders(
    "Accept: application/json\nAuthorization: Bearer old\nX-Api-Key: old",
    getAuthPreset("bearer"),
  );

  expect(headers).toContain("Accept: application/json");
  expect(headers).toContain("Authorization: Bearer <YOUR_TOKEN>");
  expect(headers).not.toContain("Bearer old");
  expect(headers).not.toContain("X-Api-Key: old");
});
