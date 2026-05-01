import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, hasRequiredSettings, loadSettings, saveSettings, type Settings } from "./store";

interface SettingsState {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const Ctx = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<SettingsState>(
    () => ({ settings, ready: hasRequiredSettings(settings), update, reset }),
    [settings, update, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings outside provider");
  return v;
}
