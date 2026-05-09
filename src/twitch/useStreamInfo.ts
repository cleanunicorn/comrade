import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useSettings } from "../settings/useSettings";
import { helix, type Stream } from "./helix";

export function useStreamInfo(pollMs = 30_000) {
  const { token, user } = useAuth();
  const { settings } = useSettings();
  const [stream, setStream] = useState<Stream | null>(null);
  const [chatterCount, setChatterCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    const api = helix(token.accessToken, settings.twitchClientId);

    async function tick() {
      if (!user || !token) return;
      try {
        const s = await api.getStream(user.id);
        if (!cancelled) setStream(s);
        try {
          const c = await api.getChatters(user.id, user.id);
          if (!cancelled) setChatterCount(c.total);
        } catch {
          // chatters endpoint requires live + scopes; ignore when offline
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    tick();
    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, user, pollMs, settings.twitchClientId]);

  return { stream, chatterCount, error };
}
