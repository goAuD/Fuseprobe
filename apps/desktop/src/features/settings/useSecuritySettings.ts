import { useEffect, useState } from "react";
import type { SecuritySettings } from "../../lib/contracts";
import { useLocale } from "../i18n/locale";
import { formatCommandError } from "../i18n/messageText";
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

        setSettings(DEFAULT_SECURITY_SETTINGS);
        setError(
          formatCommandError(strings, loadError, strings.hooks.failedToLoadSecuritySettings),
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
      setError(
        formatCommandError(strings, updateError, strings.hooks.failedToUpdateSecuritySettings),
      );
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
