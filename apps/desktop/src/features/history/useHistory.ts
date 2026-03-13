import { useEffect, useState } from "react";
import type { HistoryEntry } from "../../lib/contracts";
import {
  clearHistory as clearHistoryFromBridge,
  deleteHistoryEntry as deleteHistoryEntryFromBridge,
  loadHistory,
} from "../../lib/tauri";

export function useHistory(refreshToken = 0) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    void loadHistory()
      .then((loadedEntries) => {
        if (!isActive) {
          return;
        }

        setEntries(loadedEntries);
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }

        setEntries([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : typeof loadError === "string"
              ? loadError
              : "Failed to load desktop history.",
        );
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
    setError(null);

    try {
      const bridgedEntries = await deleteHistoryEntryFromBridge(index);
      setEntries(bridgedEntries);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : typeof deleteError === "string"
            ? deleteError
            : "Failed to remove history entry.",
      );
    }
  }

  async function clearEntries() {
    setError(null);

    try {
      const bridgedEntries = await clearHistoryFromBridge();
      setEntries(bridgedEntries);
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : typeof clearError === "string"
            ? clearError
            : "Failed to clear history.",
      );
    }
  }

  return { entries, isLoading, error, deleteEntry, clearEntries };
}
