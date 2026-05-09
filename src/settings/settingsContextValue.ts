import { createContext } from "react";
import type { Settings } from "./store";

export interface SettingsState {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const SettingsCtx = createContext<SettingsState | null>(null);
