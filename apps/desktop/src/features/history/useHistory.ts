import { useEffect, useState } from "react";
import type { HistoryEntry } from "../../lib/contracts";
import {
  clearHistory as clearHistoryFromBridge,
  deleteHistoryEntry as deleteHistoryEntryFromBridge,
  loadHistory,
} from "../../lib/tauri";

const FALLBACK_HISTORY: HistoryEntry[] = [
  {
    method: "GET",
    url: "https://api.example.com/users",
    status: 200,
    elapsed: 412,
    time: "09:41:12",
  },
  {
    method: "POST",
    url: "https://api.example.com/audit/events",
    status: 401,
    elapsed: 138,
    time: "09:43:07",
  },
];

export function useHistory(refreshToken = 0) {
  const [entries, setEntries] = useState<HistoryEntry[]>(FALLBACK_HISTORY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void loadHistory()
      .then((loadedEntries) => {
        if (!isActive) {
          return;
        }

        setEntries(loadedEntries.length > 0 ? loadedEntries : FALLBACK_HISTORY);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setEntries(FALLBACK_HISTORY);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [refreshToken]);

  async function deleteEntry(index: number) {
    const localNext = entries.filter((_, entryIndex) => entryIndex !== index);
    setEntries(localNext);

    const bridgedEntries = await deleteHistoryEntryFromBridge(index);
    if (bridgedEntries.length > 0) {
      setEntries(bridgedEntries);
    }
  }

  async function clearEntries() {
    setEntries([]);
    const bridgedEntries = await clearHistoryFromBridge();
    setEntries(bridgedEntries);
  }

  return { entries, isLoading, deleteEntry, clearEntries };
}
