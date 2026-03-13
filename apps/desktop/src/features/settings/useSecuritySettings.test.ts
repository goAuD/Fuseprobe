import "@testing-library/jest-dom/vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useSecuritySettings } from "./useSecuritySettings";
import {
  loadSecuritySettings,
  updateSecuritySettings,
} from "../../lib/tauri";

vi.mock("../../lib/tauri", () => ({
  loadSecuritySettings: vi.fn(),
  updateSecuritySettings: vi.fn(),
}));

const mockedLoadSecuritySettings = vi.mocked(loadSecuritySettings);
const mockedUpdateSecuritySettings = vi.mocked(updateSecuritySettings);

beforeEach(() => {
  mockedLoadSecuritySettings.mockReset();
  mockedUpdateSecuritySettings.mockReset();
});

it("starts with security-first defaults", async () => {
  mockedLoadSecuritySettings.mockResolvedValue({
    allowUnsafeTargets: false,
    persistHistory: false,
  });

  const { result } = renderHook(() => useSecuritySettings());

  expect(result.current.settings.allowUnsafeTargets).toBe(false);
  expect(result.current.settings.persistHistory).toBe(false);

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.error).toBeNull();
});

it("loads persisted security settings from the desktop bridge", async () => {
  mockedLoadSecuritySettings.mockResolvedValue({
    allowUnsafeTargets: true,
    persistHistory: true,
  });

  const { result } = renderHook(() => useSecuritySettings());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.settings).toEqual({
    allowUnsafeTargets: true,
    persistHistory: true,
  });
});

it("updates security settings through the desktop bridge", async () => {
  mockedLoadSecuritySettings.mockResolvedValue({
    allowUnsafeTargets: false,
    persistHistory: false,
  });
  mockedUpdateSecuritySettings.mockResolvedValue({
    allowUnsafeTargets: true,
    persistHistory: false,
  });

  const { result } = renderHook(() => useSecuritySettings());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  await act(async () => {
    await result.current.updateSettings({
      allowUnsafeTargets: true,
      persistHistory: false,
    });
  });

  expect(mockedUpdateSecuritySettings).toHaveBeenCalledWith({
    allowUnsafeTargets: true,
    persistHistory: false,
  });
  expect(result.current.settings.allowUnsafeTargets).toBe(true);
  expect(result.current.settings.persistHistory).toBe(false);
});
