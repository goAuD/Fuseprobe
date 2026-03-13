import { useEffect, useState } from "react";
import type { SecuritySettings } from "../../lib/contracts";
import {
  loadSecuritySettings as loadSecuritySettingsFromBridge,
  updateSecuritySettings as updateSecuritySettingsFromBridge,
} from "../../lib/tauri";

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  allowUnsafeTargets: false,
  persistHistory: false,
};

export function useSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings>(
    DEFAULT_SECURITY_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void loadSecuritySettingsFromBridge()
      .then((loadedSettings) => {
        if (!isActive) {
          return;
        }

        setSettings(loadedSettings);
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : typeof loadError === "string"
              ? loadError
              : "Failed to load security settings.";

        setSettings(DEFAULT_SECURITY_SETTINGS);
        setError(message);
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function updateSettings(nextSettings: SecuritySettings) {
    setError(null);

    try {
      const updatedSettings =
        await updateSecuritySettingsFromBridge(nextSettings);
      setSettings(updatedSettings);
      setError(null);
      return updatedSettings;
    } catch (updateError) {
      const message =
        updateError instanceof Error
          ? updateError.message
          : typeof updateError === "string"
            ? updateError
            : "Failed to update security settings.";

      setError(message);
      throw updateError;
    }
  }

  return {
    settings,
    isLoading,
    error,
    updateSettings,
  };
}
