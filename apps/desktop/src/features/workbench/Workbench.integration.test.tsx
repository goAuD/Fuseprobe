import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import WorkbenchPage from "./WorkbenchPage";

it("shows the send action and response region together", () => {
  render(<WorkbenchPage />);
  expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Response" })).toBeInTheDocument();
  expect(screen.getByLabelText("response-panel")).toBeInTheDocument();
});
