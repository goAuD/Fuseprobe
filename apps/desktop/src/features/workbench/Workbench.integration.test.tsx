import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import WorkbenchPage from "./WorkbenchPage";

it("shows the send action and response region together", () => {
  render(<WorkbenchPage />);
  expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Response" })).toBeInTheDocument();
  expect(screen.getByLabelText("response-panel")).toBeInTheDocument();
});

it("shows an inline alert when the request cannot be sent", () => {
  render(<WorkbenchPage />);

  fireEvent.click(screen.getByRole("button", { name: /send/i }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Enter a request URL before sending.",
  );
});

it("applies a template into the request workbench", () => {
  render(<WorkbenchPage />);

  fireEvent.click(screen.getByRole("button", { name: "GitHub API" }));

  expect(screen.getByLabelText("Request method")).toHaveValue("GET");
  expect(screen.getByLabelText("Request URL")).toHaveValue("https://api.github.com/user");
  expect(screen.getByLabelText("Request Headers")).toHaveValue(
    "Authorization: Bearer <YOUR_TOKEN>",
  );
  expect(screen.getByText("Bearer Token")).toBeInTheDocument();
  expect(screen.getByText("from GitHub API")).toBeInTheDocument();
});
