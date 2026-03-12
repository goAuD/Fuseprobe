import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import WorkbenchPage from "./WorkbenchPage";

it("renders request and response regions", () => {
  render(<WorkbenchPage />);
  expect(screen.getByRole("heading", { name: "Request" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Response" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(screen.getByLabelText("request-panel")).toBeInTheDocument();
  expect(screen.getByLabelText("response-panel")).toBeInTheDocument();
  expect(screen.getByLabelText("history-panel")).toBeInTheDocument();
});
