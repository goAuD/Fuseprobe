export interface SendRequestPayload {
  method: string;
  url: string;
  body: string;
  headers: string;
}

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
  persistenceWarning: string | null;
}

export interface SendRequestResult {
  request: SendRequestPayload;
  statusLine: string;
  durationMs: number;
  sizeLabel: string;
  contentType: string;
  charset: string;
  responseText: string;
  rawResponseText: string;
  responseHeaders: Record<string, string>;
  policyNote: string;
  persistenceWarning: string | null;
}
