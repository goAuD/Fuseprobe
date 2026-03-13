import { useEffect, useState } from "react";
import { useLocale } from "../i18n/locale";
import type { HistoryEntry } from "../../lib/contracts";
import {
  clearHistory as clearHistoryFromBridge,
  deleteHistoryEntry as deleteHistoryEntryFromBridge,
  loadHistory,
} from "../../lib/tauri";

export function useHistory(refreshToken = 0) {
  const { strings } = useLocale();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);
    setWarning(null);

    void loadHistory()
      .then((result) => {
        if (!isActive) {
          return;
        }

        setEntries(result.entries);
        setWarning(result.persistenceWarning);
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }

        setEntries([]);
        setWarning(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : typeof loadError === "string"
              ? loadError
              : strings.hooks.failedToLoadDesktopHistory,
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
  }, [refreshToken, strings.hooks.failedToLoadDesktopHistory]);

  async function deleteEntry(index: number) {
    setError(null);
    setWarning(null);

    try {
      const result = await deleteHistoryEntryFromBridge(index);
      setEntries(result.entries);
      setWarning(result.persistenceWarning);
    } catch (deleteError) {
      setWarning(null);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : typeof deleteError === "string"
            ? deleteError
            : strings.hooks.failedToRemoveHistoryEntry,
      );
    }
  }

  async function clearEntries() {
    setError(null);
    setWarning(null);

    try {
      const result = await clearHistoryFromBridge();
      setEntries(result.entries);
      setWarning(result.persistenceWarning);
    } catch (clearError) {
      setWarning(null);
      setError(
        clearError instanceof Error
          ? clearError.message
          : typeof clearError === "string"
            ? clearError
            : strings.hooks.failedToClearHistory,
      );
    }
  }

  return { entries, isLoading, error, warning, deleteEntry, clearEntries };
}
