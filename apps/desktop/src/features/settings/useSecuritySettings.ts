import { useEffect, useState } from "react";
import type { SecuritySettings } from "../../lib/contracts";
import { useLocale } from "../i18n/locale";
import {
  loadSecuritySettings as loadSecuritySettingsFromBridge,
  updateSecuritySettings as updateSecuritySettingsFromBridge,
} from "../../lib/tauri";

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  allowUnsafeTargets: false,
  persistHistory: false,
};

export function useSecuritySettings() {
  const { strings } = useLocale();
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
              : strings.hooks.failedToLoadSecuritySettings;

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
  }, [strings.hooks.failedToLoadSecuritySettings]);

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
            : strings.hooks.failedToUpdateSecuritySettings;

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
