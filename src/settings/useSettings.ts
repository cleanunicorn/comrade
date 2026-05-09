import { useContext } from "react";
import { SettingsCtx, type SettingsState } from "./settingsContextValue";

export function useSettings(): SettingsState {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error("useSettings outside provider");
  return v;
}
