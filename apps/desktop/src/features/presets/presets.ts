export type AuthPresetKey =
  | "none"
  | "bearer"
  | "basic"
  | "api_key_header"
  | "api_key_auth";

export interface AuthPreset {
  key: AuthPresetKey;
  name: string;
  description: string;
  headers: Record<string, string>;
  docs?: string;
}

export interface ApiTemplateExample {
  method: string;
  path: string;
  desc: string;
}

export interface ApiTemplate {
  name: string;
  baseUrl: string;
  auth: AuthPresetKey;
  description: string;
  docs?: string;
  examples: ApiTemplateExample[];
}

export const authPresets: Record<AuthPresetKey, AuthPreset> = {
  none: {
    key: "none",
    name: "No Auth",
    description: "No authentication",
    headers: {},
  },
  bearer: {
    key: "bearer",
    name: "Bearer Token",
    description: "JWT or OAuth2 bearer token",
    headers: { Authorization: "Bearer <YOUR_TOKEN>" },
    docs: "https://jwt.io/",
  },
  basic: {
    key: "basic",
    name: "Basic Auth",
    description: "Base64 encoded username:password",
    headers: { Authorization: "Basic <BASE64_CREDENTIALS>" },
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication",
  },
  api_key_header: {
    key: "api_key_header",
    name: "API Key (Header)",
    description: "API key in X-Api-Key header",
    headers: { "X-Api-Key": "<YOUR_API_KEY>" },
  },
  api_key_auth: {
    key: "api_key_auth",
    name: "API Key (Authorization)",
    description: "API key in Authorization header",
    headers: { Authorization: "ApiKey <YOUR_API_KEY>" },
  },
};

export const apiTemplates: ApiTemplate[] = [
  {
    name: "Localhost",
    baseUrl: "http://localhost:8080",
    auth: "none",
    description: "Local development server",
    examples: [
      { method: "GET", path: "/api/health", desc: "Health check" },
      { method: "GET", path: "/api/status", desc: "Status endpoint" },
      { method: "GET", path: "/api/v1/users", desc: "List users" },
    ],
  },
  {
    name: "Microsoft Graph API",
    baseUrl: "https://graph.microsoft.com/v1.0",
    auth: "bearer",
    description: "Microsoft 365 & Azure AD API",
    docs: "https://learn.microsoft.com/en-us/graph/api/overview",
    examples: [
      { method: "GET", path: "/me", desc: "Get current user" },
      { method: "GET", path: "/me/messages", desc: "List emails" },
      { method: "GET", path: "/me/drive/root/children", desc: "OneDrive files" },
      { method: "GET", path: "/me/calendar/events", desc: "Calendar events" },
    ],
  },
  {
    name: "GitHub API",
    baseUrl: "https://api.github.com",
    auth: "bearer",
    description: "GitHub REST API v3",
    docs: "https://docs.github.com/en/rest",
    examples: [
      { method: "GET", path: "/user", desc: "Authenticated user" },
      { method: "GET", path: "/user/repos", desc: "List repositories" },
      { method: "GET", path: "/repos/:owner/:repo", desc: "Get repository" },
      { method: "GET", path: "/repos/:owner/:repo/issues", desc: "List issues" },
    ],
  },
  {
    name: "JSONPlaceholder",
    baseUrl: "https://jsonplaceholder.typicode.com",
    auth: "none",
    description: "Free fake REST API for testing",
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
    name: "HTTPBin",
    baseUrl: "https://httpbin.org",
    auth: "none",
    description: "HTTP request & response testing",
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
    name: "ReqRes",
    baseUrl: "https://reqres.in/api",
    auth: "none",
    description: "Fake API for testing with auth flows",
    docs: "https://reqres.in/",
    examples: [
      { method: "GET", path: "/users", desc: "List users (paginated)" },
      { method: "GET", path: "/users/2", desc: "Single user" },
      { method: "POST", path: "/register", desc: "Register user" },
      { method: "POST", path: "/login", desc: "Login" },
    ],
  },
];

export const apiTemplateNames = apiTemplates.map((template) => template.name);

export function getApiTemplateByName(name: string): ApiTemplate {
  return apiTemplates.find((template) => template.name === name) ?? apiTemplates[0]!;
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
