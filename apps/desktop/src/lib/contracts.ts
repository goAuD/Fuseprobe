export interface SendRequestPayload {
  method: string;
  url: string;
  body: string;
  headers: string;
}

export interface SendRequestResult {
  request: SendRequestPayload;
  statusLine: string;
  durationMs: number;
  sizeLabel: string;
  contentType: string;
  charset: string;
  responseText: string;
  policyNote: string;
}
