import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

it("renders the Fuseprobe workbench heading", () => {
  render(<App />);
  expect(screen.getByText("Fuseprobe")).toBeInTheDocument();
  expect(screen.getByText("Offline API Client")).toBeInTheDocument();
});
