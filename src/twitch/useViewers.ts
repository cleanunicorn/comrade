import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../settings/SettingsContext";
import { helix, type Chatter } from "./helix";

export interface ViewerEntry extends Chatter {
  follows: boolean;
}

export interface ViewersState {
  viewers: ViewerEntry[];
  total: number;
  loaded: boolean;
  loading: boolean;
  lastFetchAt: number | null;
  error: string | null;
}

export function useViewers(pollMs = 15_000) {
  const { token, user } = useAuth();
  const { settings } = useSettings();
  const [state, setState] = useState<ViewersState>({
    viewers: [],
    total: 0,
    loaded: false,
    loading: false,
    lastFetchAt: null,
    error: null,
  });

  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || !user || !settings.twitchClientId) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setState((s) => ({ ...s, loading: true }));
    const api = helix(token.accessToken, settings.twitchClientId);
    try {
      const [chattersRes, followerIds] = await Promise.all([
        api.getChatters(user.id, user.id),
        api.getAllFollowerIds(user.id, user.id),
      ]);
      const viewers: ViewerEntry[] = chattersRes.chatters.map((c) => ({
        ...c,
        follows: followerIds.has(c.user_id),
      }));
      viewers.sort((a, b) => {
        if (a.follows !== b.follows) return a.follows ? -1 : 1;
        return a.user_login.localeCompare(b.user_login);
      });
      setState({
        viewers,
        total: chattersRes.total,
        loaded: true,
        loading: false,
        lastFetchAt: Date.now(),
        error: null,
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, loaded: true, error: String(e) }));
    } finally {
      fetchingRef.current = false;
    }
  }, [token, user, settings.twitchClientId]);

  useEffect(() => {
    if (!token || !user || !settings.twitchClientId) return;
    refresh();
    const id = setInterval(refresh, pollMs);
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, user, settings.twitchClientId, pollMs, refresh]);

  return { ...state, refresh };
}
