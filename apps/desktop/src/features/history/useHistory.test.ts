import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useHistory } from "./useHistory";
import {
  clearHistory,
  deleteHistoryEntry,
  loadHistory,
} from "../../lib/tauri";
import { act } from "@testing-library/react";

vi.mock("../../lib/tauri", () => ({
  clearHistory: vi.fn(),
  deleteHistoryEntry: vi.fn(),
  loadHistory: vi.fn(),
}));

const mockedLoadHistory = vi.mocked(loadHistory);
const mockedDeleteHistoryEntry = vi.mocked(deleteHistoryEntry);
const mockedClearHistory = vi.mocked(clearHistory);

beforeEach(() => {
  mockedLoadHistory.mockReset();
  mockedDeleteHistoryEntry.mockReset();
  mockedClearHistory.mockReset();
});

it("stays empty when the bridge returns no rows", async () => {
  mockedLoadHistory.mockResolvedValue([]);

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.entries).toEqual([]);
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

it("reloads when the refresh token changes", async () => {
  mockedLoadHistory
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      {
        method: "PATCH",
        url: "https://example.com/users/7",
        status: 200,
        elapsed: 55,
        time: "10:13:09",
      },
    ]);

  const { result, rerender } = renderHook(
    ({ refreshToken }) => useHistory(refreshToken),
    {
      initialProps: { refreshToken: 0 },
    },
  );

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  rerender({ refreshToken: 1 });

  await waitFor(() => {
    expect(result.current.entries[0]?.method).toBe("PATCH");
  });

  expect(mockedLoadHistory).toHaveBeenCalledTimes(2);
});

it("stays empty when history loading fails", async () => {
  mockedLoadHistory.mockRejectedValue(new Error("desktop bridge unavailable"));

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.entries).toEqual([]);
  expect(result.current.error).toBe("desktop bridge unavailable");
});

it("deletes a history row through the bridge and updates local state", async () => {
  mockedLoadHistory.mockResolvedValue([
    {
      method: "GET",
      url: "https://example.com/users",
      status: 200,
      elapsed: 40,
      time: "10:00:00",
    },
    {
      method: "POST",
      url: "https://example.com/users",
      status: 201,
      elapsed: 52,
      time: "10:01:00",
    },
  ]);
  mockedDeleteHistoryEntry.mockResolvedValue([
    {
      method: "POST",
      url: "https://example.com/users",
      status: 201,
      elapsed: 52,
      time: "10:01:00",
    },
  ]);

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  await act(async () => {
    await result.current.deleteEntry(0);
  });

  expect(mockedDeleteHistoryEntry).toHaveBeenCalledWith(0);
  expect(result.current.entries).toHaveLength(1);
  expect(result.current.entries[0]?.method).toBe("POST");
});

it("clears history through the bridge and empties local state", async () => {
  mockedLoadHistory.mockResolvedValue([
    {
      method: "GET",
      url: "https://example.com/users",
      status: 200,
      elapsed: 40,
      time: "10:00:00",
    },
  ]);
  mockedClearHistory.mockResolvedValue([]);

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  await act(async () => {
    await result.current.clearEntries();
  });

  expect(mockedClearHistory).toHaveBeenCalledTimes(1);
  expect(result.current.entries).toEqual([]);
});

it("accepts an empty bridge result after deleting the final history row", async () => {
  mockedLoadHistory.mockResolvedValue([
    {
      method: "GET",
      url: "https://example.com/users",
      status: 200,
      elapsed: 40,
      time: "10:00:00",
    },
  ]);
  mockedDeleteHistoryEntry.mockResolvedValue([]);

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  await act(async () => {
    await result.current.deleteEntry(0);
  });

  expect(result.current.entries).toEqual([]);
});

it("keeps the current entries when deleting through the bridge fails", async () => {
  mockedLoadHistory.mockResolvedValue([
    {
      method: "GET",
      url: "https://example.com/users",
      status: 200,
      elapsed: 40,
      time: "10:00:00",
    },
  ]);
  mockedDeleteHistoryEntry.mockRejectedValue(new Error("delete failed"));

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  await act(async () => {
    await result.current.deleteEntry(0);
  });

  expect(result.current.entries).toHaveLength(1);
  expect(result.current.error).toBe("delete failed");
});

it("keeps the current entries when clearing through the bridge fails", async () => {
  mockedLoadHistory.mockResolvedValue([
    {
      method: "GET",
      url: "https://example.com/users",
      status: 200,
      elapsed: 40,
      time: "10:00:00",
    },
  ]);
  mockedClearHistory.mockRejectedValue(new Error("clear failed"));

  const { result } = renderHook(() => useHistory());

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  await act(async () => {
    await result.current.clearEntries();
  });

  expect(result.current.entries).toHaveLength(1);
  expect(result.current.error).toBe("clear failed");
});
