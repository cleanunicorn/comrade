import { createContext } from "react";
import type { TwitchToken, TwitchUser } from "./twitchAuth";

export interface AuthState {
  token: TwitchToken | null;
  user: TwitchUser | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
}

export const AuthCtx = createContext<AuthState | null>(null);
