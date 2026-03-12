import { apiTemplateNames } from "./presets";

it("includes jsonplaceholder in the desktop preset list", () => {
  expect(apiTemplateNames).toContain("JSONPlaceholder");
});
