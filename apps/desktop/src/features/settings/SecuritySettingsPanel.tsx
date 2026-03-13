import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { SecuritySettings } from "../../lib/contracts";
import { useLocale } from "../i18n/locale";
import { useSecuritySettings } from "./useSecuritySettings";

type SecuritySettingKey = keyof SecuritySettings;

interface ConfirmModalProps {
  cancelLabel: string;
  confirmLabel: string;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function ConfirmModal({
  cancelLabel,
  confirmLabel,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.requestAnimationFrame(() => {
      confirmButtonRef.current?.focus();
    });

    return () => {
      lastFocusedElementRef.current?.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const currentIndex = focusable.findIndex(
      (element) => element === document.activeElement,
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && (document.activeElement === first || currentIndex === -1)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || currentIndex === -1)) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className="confirm-overlay" onMouseDown={onCancel}>
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="confirm-title">{title}</h3>
        <p id={messageId} className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            ref={confirmButtonRef}
            type="button"
            className="confirm-btn confirm-btn-ok"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="confirm-btn confirm-btn-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  loadingLabel,
  onToggle,
  riskLabel,
  riskTitle,
}: SecurityToggleRowProps) {
  const { strings } = useLocale();
  const stateLabel = disabled
    ? loadingLabel ?? strings.security.saving
    : checked
      ? strings.security.enabled
      : strings.security.disabled;

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
              {strings.security.riskBadge}
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
          <span className="security-switch-state">{stateLabel}</span>
        </label>
      </div>

      <p className="security-note">{riskLabel}</p>
    </article>
  );
}

export default function SecuritySettingsPanel() {
  const { strings } = useLocale();
  const { settings, isLoading, error, updateSettings } = useSecuritySettings();
  const [pendingSetting, setPendingSetting] = useState<SecuritySettingKey | null>(
    null,
  );
  const [confirmTarget, setConfirmTarget] = useState<SecuritySettingKey | null>(null);

  const confirmTitle = confirmTarget === "allowUnsafeTargets"
    ? strings.security.unsafeTargets.confirmationTitle
    : strings.security.persistHistory.confirmationTitle;
  const confirmMessage = confirmTarget === "allowUnsafeTargets"
    ? strings.security.unsafeTargets.confirmationMessage
    : strings.security.persistHistory.confirmationMessage;

  const handleConfirm = useCallback(async () => {
    if (!confirmTarget) return;
    const key = confirmTarget;
    setConfirmTarget(null);
    setPendingSetting(key);
    try {
      await updateSettings({ ...settings, [key]: true });
    } catch {
      // The hook captures the user-facing error state.
    } finally {
      setPendingSetting(null);
    }
  }, [confirmTarget, settings, updateSettings]);

  const handleCancel = useCallback(() => {
    setConfirmTarget(null);
  }, []);

  function toggleSetting(settingKey: SecuritySettingKey) {
    const nextValue = !settings[settingKey];

    if (nextValue) {
      setConfirmTarget(settingKey);
      return;
    }

    setPendingSetting(settingKey);
    updateSettings({ ...settings, [settingKey]: false })
      .catch(() => { /* hook captures error */ })
      .finally(() => setPendingSetting(null));
  }

  const controlsDisabled = isLoading || pendingSetting !== null;

  return (
    <>
      <section className="panel security-panel" aria-label="security-panel">
        <div className="panel-header">
          <h2>{strings.security.title}</h2>
          <span className="panel-meta">{strings.security.meta}</span>
        </div>

        <div className="security-list">
          {error ? (
            <p className="security-error" role="alert">
              {error}
            </p>
          ) : isLoading ? (
            <p className="security-loading">{strings.security.loading}</p>
          ) : null}

          <SecurityToggleRow
            checked={settings.allowUnsafeTargets}
            description={strings.security.unsafeTargets.description}
            disabled={controlsDisabled}
            label={strings.security.unsafeTargets.label}
            riskLabel={strings.security.unsafeTargets.riskLabel}
            riskTitle={strings.security.unsafeTargets.riskTitle}
            onToggle={() => void toggleSetting("allowUnsafeTargets")}
          />

          <SecurityToggleRow
            checked={settings.persistHistory}
            description={strings.security.persistHistory.description}
            disabled={controlsDisabled}
            label={strings.security.persistHistory.label}
            riskLabel={strings.security.persistHistory.riskLabel}
            riskTitle={strings.security.persistHistory.riskTitle}
            onToggle={() => void toggleSetting("persistHistory")}
          />
        </div>
      </section>
      {confirmTarget && (
        <ConfirmModal
          cancelLabel={strings.security.confirmCancel}
          confirmLabel={strings.security.confirmOk}
          title={confirmTitle}
          message={confirmMessage}
          onConfirm={() => void handleConfirm()}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
