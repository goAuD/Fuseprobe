import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useHistory } from "./useHistory";
import { loadHistory } from "../../lib/tauri";

vi.mock("../../lib/tauri", () => ({
  loadHistory: vi.fn(),
}));

const mockedLoadHistory = vi.mocked(loadHistory);

beforeEach(() => {
  mockedLoadHistory.mockReset();
});

it("falls back to seeded history when the bridge returns no rows", async () => {
  mockedLoadHistory.mockResolvedValue([]);

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.entries[0]?.method).toBe("GET");
  expect(result.current.entries[0]?.url).toContain("api.example.com/users");
});

it("uses loaded history rows when the bridge returns data", async () => {
  mockedLoadHistory.mockResolvedValue([
    {
      method: "DELETE",
      url: "https://example.com/users/42",
      status: 204,
      elapsed: 91,
      time: "10:12:44",
    },
  ]);

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.entries).toEqual([
    {
      method: "DELETE",
      url: "https://example.com/users/42",
      status: 204,
      elapsed: 91,
      time: "10:12:44",
    },
  ]);
});
