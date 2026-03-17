export interface SendRequestPayload {
  method: string;
  url: string;
  body: string;
  headers: string;
}

export type PersistenceWarningCode =
  | "config_dir_unavailable"
  | "settings_parse_failed"
  | "history_load_failed"
  | "history_parse_failed"
  | "history_path_unavailable"
  | "history_save_failed"
  | "history_remove_failed";

export type CommandErrorCode =
  | "request_in_progress"
  | "request_invalid_url"
  | "request_unsafe_target"
  | "request_invalid_body"
  | "request_body_too_large"
  | "request_invalid_headers"
  | "request_headers_too_large"
  | "request_timeout"
  | "request_connection_local_unavailable"
  | "request_connection_failed"
  | "request_failed"
  | "request_worker_failed"
  | "history_unavailable"
  | "settings_unavailable"
  | "settings_save_unavailable"
  | "settings_save_failed"
  | "persistence_warning_unavailable";

export type RequestPolicyCode = "redirects_disabled";

export interface SecuritySettings {
  allowUnsafeTargets: boolean;
  persistHistory: boolean;
}

export interface HistoryEntry {
  method: string;
  url: string;
  status: number;
  elapsed: number;
  time: string;
}

export interface HistoryCommandResult {
  entries: HistoryEntry[];
  persistenceWarningCode: PersistenceWarningCode | null;
}

export interface SendRequestResult {
  request: SendRequestPayload;
  statusCode: number;
  reason: string;
  durationMs: number;
  byteCount: number;
  contentType: string;
  charset: string;
  responseText: string;
  rawResponseText: string;
  responseHeaders: Record<string, string>;
  policyCode: RequestPolicyCode;
  isBinary: boolean;
  truncated: boolean;
  redirectLocation: string | null;
  persistenceWarningCode: PersistenceWarningCode | null;
}
