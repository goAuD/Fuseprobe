import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

it("renders the Fuseprobe workbench heading", () => {
  render(<App />);
  expect(
    screen.getByText(
      (_, el) =>
        el !== null &&
        el.classList.contains("brand-title") &&
        el.textContent === "Fuseprobe",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("Offline API Client")).toBeInTheDocument();
});

it("switches visible shell strings when the locale changes", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Interface language" }));
  fireEvent.click(screen.getByRole("option", { name: "DE" }));

  expect(screen.getByText("Offline-API-Client")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Senden" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Anfrage" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Antwort" })).toBeInTheDocument();
});
