import { useEffect, useState } from "react";
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
  error: string | null;
}

export function useViewers(pollMs = 30_000) {
  const { token, user } = useAuth();
  const { settings } = useSettings();
  const [state, setState] = useState<ViewersState>({
    viewers: [],
    total: 0,
    loaded: false,
    error: null,
  });

  useEffect(() => {
    if (!token || !user || !settings.twitchClientId) return;
    let cancelled = false;
    const api = helix(token.accessToken, settings.twitchClientId);

    async function tick() {
      if (!user) return;
      try {
        const [chattersRes, followerIds] = await Promise.all([
          api.getChatters(user.id, user.id),
          api.getAllFollowerIds(user.id, user.id),
        ]);
        if (cancelled) return;
        const viewers: ViewerEntry[] = chattersRes.chatters.map((c) => ({
          ...c,
          follows: followerIds.has(c.user_id),
        }));
        viewers.sort((a, b) => {
          if (a.follows !== b.follows) return a.follows ? -1 : 1;
          return a.user_login.localeCompare(b.user_login);
        });
        setState({ viewers, total: chattersRes.total, loaded: true, error: null });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, error: String(e), loaded: true }));
      }
    }

    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, user, settings.twitchClientId, pollMs]);

  return state;
}
