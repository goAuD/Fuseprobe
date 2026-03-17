import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { LOCALE_STORAGE_KEY } from "./features/i18n/locale";

beforeEach(() => {
  window.localStorage.clear();
});

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

it("hydrates the locale from persisted storage", () => {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, "hu");

  render(<App />);

  expect(screen.getByText("Offline API kliens")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Küldés" })).toBeInTheDocument();
});

it("switches visible shell strings when the locale changes", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Interface language" }));
  fireEvent.click(screen.getByRole("option", { name: "DE" }));

  expect(screen.getByText("Offline-API-Client")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Senden" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Anfrage" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Antwort" })).toBeInTheDocument();
  expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("de");
});

it("falls back to english when persisted locale is invalid", () => {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, "fr");

  render(<App />);

  expect(screen.getByText("Offline API Client")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");
});
