import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SecuritySettingsPanel from "./SecuritySettingsPanel";
import { useSecuritySettings } from "./useSecuritySettings";

vi.mock("./useSecuritySettings", () => ({
  useSecuritySettings: vi.fn(),
}));

const mockedUseSecuritySettings = vi.mocked(useSecuritySettings);

beforeEach(() => {
  mockedUseSecuritySettings.mockReset();
  vi.restoreAllMocks();
});

it("prompts for confirmation before enabling unsafe local targets", async () => {
  const updateSettings = vi.fn().mockResolvedValue({
    allowUnsafeTargets: true,
    persistHistory: false,
  });

  mockedUseSecuritySettings.mockReturnValue({
    settings: {
      allowUnsafeTargets: false,
      persistHistory: false,
    },
    isLoading: false,
    error: null,
    updateSettings,
  });

  render(<SecuritySettingsPanel />);

  fireEvent.click(
    screen.getByRole("checkbox", { name: "Unsafe mode / Local targets" }),
  );

  expect(
    screen.getByRole("dialog", { name: /Enable Unsafe mode/i }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "OK" }));

  await waitFor(() => {
    expect(updateSettings).toHaveBeenCalledWith({
      allowUnsafeTargets: true,
      persistHistory: false,
    });
  });
});

it("does not update unsafe mode when confirmation is cancelled", async () => {
  const updateSettings = vi.fn().mockResolvedValue({
    allowUnsafeTargets: true,
    persistHistory: false,
  });

  mockedUseSecuritySettings.mockReturnValue({
    settings: {
      allowUnsafeTargets: false,
      persistHistory: false,
    },
    isLoading: false,
    error: null,
    updateSettings,
  });

  render(<SecuritySettingsPanel />);

  fireEvent.click(
    screen.getByRole("checkbox", { name: "Unsafe mode / Local targets" }),
  );

  // Modal appears
  expect(screen.getByRole("dialog")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  await waitFor(() => {
    expect(updateSettings).not.toHaveBeenCalled();
  });

  // Modal dismissed
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("dismisses the confirmation dialog with Escape", async () => {
  const updateSettings = vi.fn().mockResolvedValue({
    allowUnsafeTargets: true,
    persistHistory: false,
  });

  mockedUseSecuritySettings.mockReturnValue({
    settings: {
      allowUnsafeTargets: false,
      persistHistory: false,
    },
    isLoading: false,
    error: null,
    updateSettings,
  });

  render(<SecuritySettingsPanel />);

  fireEvent.click(
    screen.getByRole("checkbox", { name: "Unsafe mode / Local targets" }),
  );

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

  await waitFor(() => {
    expect(updateSettings).not.toHaveBeenCalled();
  });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("prompts for confirmation before enabling history persistence", async () => {
  const updateSettings = vi.fn().mockResolvedValue({
    allowUnsafeTargets: false,
    persistHistory: true,
  });

  mockedUseSecuritySettings.mockReturnValue({
    settings: {
      allowUnsafeTargets: false,
      persistHistory: false,
    },
    isLoading: false,
    error: null,
    updateSettings,
  });

  render(<SecuritySettingsPanel />);

  fireEvent.click(
    screen.getByRole("checkbox", { name: "History persistence" }),
  );

  expect(
    screen.getByRole("dialog", { name: /Enable History persistence/i }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "OK" }));

  await waitFor(() => {
    expect(updateSettings).toHaveBeenCalledWith({
      allowUnsafeTargets: false,
      persistHistory: true,
    });
  });
});

it("renders hover/focus risk affordances for both security toggles", () => {
  mockedUseSecuritySettings.mockReturnValue({
    settings: {
      allowUnsafeTargets: false,
      persistHistory: false,
    },
    isLoading: false,
    error: null,
    updateSettings: vi.fn(),
  });

  render(<SecuritySettingsPanel />);

  expect(
    screen.getByTitle(/Allows requests to localhost, private IP ranges/i),
  ).toBeInTheDocument();
  expect(
    screen.getByTitle(/Stores redacted request history on this device/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Blocked by default to reduce accidental local-network and metadata probing.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Off by default so request activity is not written to disk unless you choose it.",
    ),
  ).toBeInTheDocument();
});
