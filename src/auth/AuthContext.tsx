import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearAuth,
  loadToken,
  loadUser,
  parseFragment,
  saveToken,
  saveUser,
  startLogin,
  validateToken,
  type TwitchToken,
  type TwitchUser,
} from "./twitchAuth";
import { helix } from "../twitch/helix";
import { AuthCtx, type AuthState } from "./authContextValue";
import { useSettings } from "../settings/useSettings";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings, ready } = useSettings();
  const [token, setToken] = useState<TwitchToken | null>(null);
  const [user, setUser] = useState<TwitchUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        let t = parseFragment();
        if (t) saveToken(t);
        else t = loadToken();

        if (!t) {
          setLoading(false);
          return;
        }

        const v = await validateToken(t.accessToken);
        if (!v) {
          clearAuth();
          setLoading(false);
          return;
        }

        const refreshed: TwitchToken = {
          ...t,
          scopes: v.scopes,
          expiresAt: Date.now() + v.expires_in * 1000,
        };
        saveToken(refreshed);
        setToken(refreshed);

        let u = loadUser();
        if (!u || u.id !== v.user_id) {
          const fetched = await helix(t.accessToken, settings.twitchClientId).getUsers([v.user_id]);
          u = fetched[0] ?? null;
          if (u) saveUser(u);
        }
        setUser(u);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, settings.twitchClientId]);

  const login = useCallback(() => {
    startLogin(settings.twitchClientId, settings.redirectUri);
  }, [settings.twitchClientId, settings.redirectUri]);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ token, user, loading, error, login, logout }),
    [token, user, loading, error, login, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
