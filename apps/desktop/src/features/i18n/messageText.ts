import type {
  CommandErrorCode,
  PersistenceWarningCode,
} from "../../lib/contracts";
import type { LocaleCode, LocaleStrings } from "./locale";

function hasCode<T extends string>(
  value: string,
  lookup: Record<T, string>,
): value is T {
  return Object.prototype.hasOwnProperty.call(lookup, value);
}

export function formatCommandError(
  strings: LocaleStrings,
  error: unknown,
  fallback: string,
): string {
  if (typeof error === "string" && hasCode(error, strings.messages.errors)) {
    return strings.messages.errors[error as CommandErrorCode];
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}

export function formatPersistenceWarning(
  strings: LocaleStrings,
  warningCode: PersistenceWarningCode | null,
): string | null {
  if (!warningCode) {
    return null;
  }

  return strings.messages.warnings[warningCode];
}

export function formatByteCount(locale: LocaleCode, byteCount: number): string {
  const formatter = new Intl.NumberFormat(locale);

  if (byteCount < 1024) {
    return `${formatter.format(byteCount)} B`;
  }

  if (byteCount < 1024 * 1024) {
    return `${formatter.format(Number((byteCount / 1024).toFixed(1)))} KB`;
  }

  return `${formatter.format(Number((byteCount / (1024 * 1024)).toFixed(2)))} MB`;
}
