import { useState } from "react";
import type { SecuritySettings } from "../../lib/contracts";
import { useSecuritySettings } from "./useSecuritySettings";

type SecuritySettingKey = keyof SecuritySettings;

const UNSAFE_TARGETS_RISK =
  "Allows requests to localhost, private IP ranges, link-local targets, and metadata-style endpoints. Enable only when you intentionally need local or internal targets.";
const UNSAFE_TARGETS_CONFIRMATION =
  "Enable Unsafe mode / Local targets?\n\nThis allows requests to localhost, private IP ranges, link-local targets, and metadata-style endpoints. Use it only when you intentionally need local or internal targets on this device.";
const HISTORY_PERSISTENCE_RISK =
  "Stores redacted request history on this device under the local app config directory. Enable only if you accept local persistence for this workstation.";
const HISTORY_PERSISTENCE_CONFIRMATION =
  "Enable History persistence?\n\nThis stores redacted request history on this device. Use it only if you accept local persistence for this workstation.";

interface SecurityToggleRowProps {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  loadingLabel?: string;
  onToggle: () => void;
  riskLabel: string;
  riskTitle: string;
}

function SecurityToggleRow({
  checked,
  description,
  disabled,
  label,
  loadingLabel = "Saving...",
  onToggle,
  riskLabel,
  riskTitle,
}: SecurityToggleRowProps) {
  return (
    <article className="security-item">
      <div className="security-item-header">
        <div className="security-copy">
          <div className="security-title-row">
            <strong>{label}</strong>
            <span
              aria-label={`${label} risk information`}
              className="security-risk"
              tabIndex={0}
              title={riskTitle}
            >
              Risk
            </span>
          </div>
          <p>{description}</p>
        </div>

        <label className="security-switch">
          <input
            aria-label={label}
            checked={checked}
            className="security-switch-input"
            disabled={disabled}
            type="checkbox"
            onChange={onToggle}
          />
          <span className="security-switch-track" aria-hidden="true" />
          <span className="security-switch-state">
            {disabled ? loadingLabel : checked ? "Enabled" : "Disabled"}
          </span>
        </label>
      </div>

      <p className="security-note">{riskLabel}</p>
    </article>
  );
}

export default function SecuritySettingsPanel() {
  const { settings, isLoading, error, updateSettings } = useSecuritySettings();
  const [pendingSetting, setPendingSetting] = useState<SecuritySettingKey | null>(
    null,
  );

  async function toggleSetting(settingKey: SecuritySettingKey) {
    const nextValue = !settings[settingKey];
    const requiresConfirmation = nextValue;

    if (requiresConfirmation) {
      const confirmationMessage =
        settingKey === "allowUnsafeTargets"
          ? UNSAFE_TARGETS_CONFIRMATION
          : HISTORY_PERSISTENCE_CONFIRMATION;

      if (!window.confirm(confirmationMessage)) {
        return;
      }
    }

    setPendingSetting(settingKey);

    try {
      await updateSettings({
        ...settings,
        [settingKey]: nextValue,
      });
    } catch {
      // The hook captures the user-facing error state.
    } finally {
      setPendingSetting(null);
    }
  }

  const controlsDisabled = isLoading || pendingSetting !== null;

  return (
    <section className="panel security-panel" aria-label="security-panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">Security</p>
          <h2>Security Defaults</h2>
        </div>
        <span className="panel-meta">explicit opt-in only</span>
      </div>

      <div className="security-list">
        {error ? (
          <p className="security-error" role="alert">
            {error}
          </p>
        ) : isLoading ? (
          <p className="security-loading">Loading local security settings...</p>
        ) : null}

        <SecurityToggleRow
          checked={settings.allowUnsafeTargets}
          description="Keeps localhost, private, link-local, and metadata-style targets blocked unless you explicitly opt in."
          disabled={controlsDisabled}
          label="Unsafe mode / Local targets"
          riskLabel="Blocked by default to reduce accidental local-network and metadata probing."
          riskTitle={UNSAFE_TARGETS_RISK}
          onToggle={() => void toggleSetting("allowUnsafeTargets")}
        />

        <SecurityToggleRow
          checked={settings.persistHistory}
          description="Keeps request history session-only unless you explicitly allow local persistence on this device."
          disabled={controlsDisabled}
          label="History persistence"
          riskLabel="Off by default so request activity is not written to disk unless you choose it."
          riskTitle={HISTORY_PERSISTENCE_RISK}
          onToggle={() => void toggleSetting("persistHistory")}
        />
      </div>
    </section>
  );
}
