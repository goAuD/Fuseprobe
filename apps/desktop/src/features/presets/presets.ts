export type AuthPresetKey =
  | "none"
  | "bearer"
  | "basic"
  | "api_key_header"
  | "api_key_auth";

export type ApiTemplateKey =
  | "open_meteo"
  | "microsoft_graph"
  | "github"
  | "jsonplaceholder"
  | "httpbin"
  | "reqres";

export interface AuthPreset {
  key: AuthPresetKey;
  headers: Record<string, string>;
  docs?: string;
}

export interface ApiTemplateExample {
  method: string;
  path: string;
  desc: string;
}

export interface ApiTemplate {
  key: ApiTemplateKey;
  baseUrl: string;
  auth: AuthPresetKey;
  docs?: string;
  examples: ApiTemplateExample[];
}

export const authPresets: Record<AuthPresetKey, AuthPreset> = {
  none: {
    key: "none",
    headers: {},
  },
  bearer: {
    key: "bearer",
    headers: { Authorization: "Bearer <YOUR_TOKEN>" },
    docs: "https://jwt.io/",
  },
  basic: {
    key: "basic",
    headers: { Authorization: "Basic <BASE64_CREDENTIALS>" },
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication",
  },
  api_key_header: {
    key: "api_key_header",
    headers: { "X-Api-Key": "<YOUR_API_KEY>" },
  },
  api_key_auth: {
    key: "api_key_auth",
    headers: { Authorization: "ApiKey <YOUR_API_KEY>" },
  },
};

export const apiTemplates: ApiTemplate[] = [
  {
    key: "open_meteo",
    baseUrl: "https://api.open-meteo.com/v1",
    auth: "none",
    examples: [
      { method: "GET", path: "/forecast?latitude=47.4979&longitude=19.0402&current=temperature_2m", desc: "Budapest current weather" },
      { method: "GET", path: "/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m", desc: "Berlin hourly forecast" },
      { method: "GET", path: "/forecast?latitude=48.2082&longitude=16.3738&daily=temperature_2m_max&timezone=auto", desc: "Vienna daily forecast" },
    ],
  },
  {
    key: "microsoft_graph",
    baseUrl: "https://graph.microsoft.com/v1.0",
    auth: "bearer",
    docs: "https://learn.microsoft.com/en-us/graph/api/overview",
    examples: [
      { method: "GET", path: "/me", desc: "Get current user" },
      { method: "GET", path: "/me/messages", desc: "List emails" },
      { method: "GET", path: "/me/drive/root/children", desc: "OneDrive files" },
      { method: "GET", path: "/me/calendar/events", desc: "Calendar events" },
    ],
  },
  {
    key: "github",
    baseUrl: "https://api.github.com",
    auth: "bearer",
    docs: "https://docs.github.com/en/rest",
    examples: [
      { method: "GET", path: "/user", desc: "Authenticated user" },
      { method: "GET", path: "/user/repos", desc: "List repositories" },
      { method: "GET", path: "/repos/:owner/:repo", desc: "Get repository" },
      { method: "GET", path: "/repos/:owner/:repo/issues", desc: "List issues" },
    ],
  },
  {
    key: "jsonplaceholder",
    baseUrl: "https://jsonplaceholder.typicode.com",
    auth: "none",
    docs: "https://jsonplaceholder.typicode.com/",
    examples: [
      { method: "GET", path: "/posts", desc: "List posts" },
      { method: "GET", path: "/posts/1", desc: "Get post by ID" },
      { method: "POST", path: "/posts", desc: "Create post" },
      { method: "GET", path: "/users", desc: "List users" },
      { method: "GET", path: "/comments?postId=1", desc: "Comments for post" },
    ],
  },
  {
    key: "httpbin",
    baseUrl: "https://httpbin.org",
    auth: "none",
    docs: "https://httpbin.org/",
    examples: [
      { method: "GET", path: "/get", desc: "Returns GET data" },
      { method: "POST", path: "/post", desc: "Returns POST data" },
      { method: "GET", path: "/headers", desc: "Returns request headers" },
      { method: "GET", path: "/ip", desc: "Returns origin IP" },
      { method: "GET", path: "/status/418", desc: "I'm a teapot!" },
    ],
  },
  {
    key: "reqres",
    baseUrl: "https://reqres.in/api",
    auth: "none",
    docs: "https://reqres.in/",
    examples: [
      { method: "GET", path: "/users", desc: "List users (paginated)" },
      { method: "GET", path: "/users/2", desc: "Single user" },
      { method: "POST", path: "/register", desc: "Register user" },
      { method: "POST", path: "/login", desc: "Login" },
    ],
  },
];

export const apiTemplateKeys = apiTemplates.map((template) => template.key);

export function getApiTemplateByKey(key: ApiTemplateKey): ApiTemplate {
  return apiTemplates.find((template) => template.key === key) ?? apiTemplates[0]!;
}

export function getAuthPreset(key: AuthPresetKey): AuthPreset {
  return authPresets[key];
}

export function applyAuthPresetHeaders(
  existingHeadersText: string,
  authPreset: AuthPreset,
): string {
  const retainedLines = existingHeadersText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const headerName = line.split(":", 1)[0]?.trim().toLowerCase();
      return headerName !== "authorization" && headerName !== "x-api-key";
    });

  const authLines = Object.entries(authPreset.headers).map(
    ([key, value]) => `${key}: ${value}`,
  );

  return [...retainedLines, ...authLines].join("\n");
}
