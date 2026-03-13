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
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

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

  expect(confirmSpy).toHaveBeenCalledWith(
    expect.stringContaining("Enable Unsafe mode / Local targets?"),
  );

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
  vi.spyOn(window, "confirm").mockReturnValue(false);

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

  await waitFor(() => {
    expect(updateSettings).not.toHaveBeenCalled();
  });
});

it("prompts for confirmation before enabling history persistence", async () => {
  const updateSettings = vi.fn().mockResolvedValue({
    allowUnsafeTargets: false,
    persistHistory: true,
  });
  const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

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

  expect(confirmSpy).toHaveBeenCalledWith(
    expect.stringContaining("Enable History persistence?"),
  );

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
