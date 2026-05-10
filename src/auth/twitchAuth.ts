const TOKEN_KEY = "comrade.twitch.token";
const USER_KEY = "comrade.twitch.user";

export interface TwitchToken {
  accessToken: string;
  scopes: string[];
  expiresAt: number;
}

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

export const TWITCH_SCOPES = [
  "user:read:email",
  "chat:read",
  "chat:edit",
  "channel:read:subscriptions",
  "moderator:read:followers",
  "moderator:read:chatters",
  "channel:read:redemptions",
  "bits:read",
  "moderator:manage:chat_messages",
  "moderator:manage:banned_users",
  "user:manage:blocked_users",
];

export function hasRequiredScopes(scopes: string[]): boolean {
  return TWITCH_SCOPES.every((s) => scopes.includes(s));
}

export function loadToken(): TwitchToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as TwitchToken;
    if (Date.now() >= t.expiresAt) {
      clearAuth();
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

export function saveToken(t: TwitchToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

export function loadUser(): TwitchUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as TwitchUser) : null;
}

export function saveUser(u: TwitchUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function buildAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "token",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: TWITCH_SCOPES.join(" "),
    state,
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

export function startLogin(clientId: string, redirectUri: string) {
  const state = crypto.randomUUID();
  sessionStorage.setItem("comrade.oauth.state", state);
  window.location.href = buildAuthorizeUrl(clientId, redirectUri, state);
}

export function parseFragment(): TwitchToken | null {
  if (!window.location.hash || window.location.hash.length < 2) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  const state = params.get("state");
  const expected = sessionStorage.getItem("comrade.oauth.state");
  if (expected && state !== expected) {
    console.warn("OAuth state mismatch");
    return null;
  }
  sessionStorage.removeItem("comrade.oauth.state");

  const expiresIn = parseInt(params.get("expires_in") || "14400", 10);
  const scopes = (params.get("scope") || "").split(" ").filter(Boolean);

  history.replaceState(null, "", window.location.pathname + window.location.search);

  return {
    accessToken,
    scopes,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export interface ValidateResponse {
  login: string;
  user_id: string;
  client_id: string;
  scopes: string[];
  expires_in: number;
}

export async function validateToken(accessToken: string): Promise<ValidateResponse | null> {
  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}
