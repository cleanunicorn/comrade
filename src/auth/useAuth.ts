import { useContext } from "react";
import { AuthCtx, type AuthState } from "./authContextValue";

export function useAuth(): AuthState {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
