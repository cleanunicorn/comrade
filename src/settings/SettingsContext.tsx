import { useCallback, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, hasRequiredSettings, loadSettings, saveSettings, type Settings } from "./store";
import { SettingsCtx, type SettingsState } from "./settingsContextValue";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

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

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}
