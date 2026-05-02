import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "../settings/SettingsContext";
import { getActiveMatch, getHeroes, type ActiveMatch, type HeroInfo } from "./api";

const POLL_MS = 12_000;

export interface ActiveMatchState {
  match: ActiveMatch | null;
  heroes: Record<number, HeroInfo>;
  loading: boolean;
  error: string | null;
  lastFetchAt: number | null;
}

export function useActiveMatch() {
  const { settings } = useSettings();
  const accountId = settings.steamAccountId.trim();
  const [state, setState] = useState<ActiveMatchState>({
    match: null,
    heroes: {},
    loading: false,
    error: null,
    lastFetchAt: null,
  });
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!accountId) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState((s) => ({ ...s, loading: true }));
    try {
      const [match, heroes] = await Promise.all([getActiveMatch(accountId), getHeroes()]);
      setState({
        match,
        heroes,
        loading: false,
        error: null,
        lastFetchAt: Date.now(),
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: String(e) }));
    } finally {
      inFlightRef.current = false;
    }
  }, [accountId]);

  useEffect(() => {
    if (!accountId) {
      setState({ match: null, heroes: {}, loading: false, error: null, lastFetchAt: null });
      return;
    }
    refresh();
    let id: number | null = null;
    const start = () => {
      if (id != null) return;
      id = window.setInterval(refresh, POLL_MS);
    };
    const stop = () => {
      if (id != null) window.clearInterval(id);
      id = null;
    };
    start();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
        start();
      } else {
        stop();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accountId, refresh]);

  return { ...state, refresh, accountId };
}
