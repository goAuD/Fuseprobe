import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider, LOCALE_STORAGE_KEY } from "../i18n/locale";
import WorkbenchPage from "./WorkbenchPage";

beforeEach(() => {
  window.localStorage.clear();
});

it("renders request and response regions", () => {
  render(
    <LocaleProvider>
      <WorkbenchPage />
    </LocaleProvider>,
  );
  expect(screen.getByRole("heading", { name: "Request" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Response" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(screen.getByLabelText("request-panel")).toBeInTheDocument();
  expect(screen.getByLabelText("response-panel")).toBeInTheDocument();
  expect(screen.getByLabelText("history-panel")).toBeInTheDocument();
});

it("uses the persisted locale on first render", () => {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, "de");

  render(
    <LocaleProvider>
      <WorkbenchPage />
    </LocaleProvider>,
  );

  expect(screen.getByRole("heading", { name: "Anfrage" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Antwort" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Verlauf" })).toBeInTheDocument();
});
