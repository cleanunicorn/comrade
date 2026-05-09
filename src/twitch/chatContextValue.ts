import { createContext } from "react";
import type { SevenTvEmote } from "./sevenTv";
import type { ChatMessage, ChatStatus } from "./useChat";

export interface ChatContextValue {
  messages: ChatMessage[];
  status: ChatStatus;
  send: (text: string) => void;
  sevenTvEmotes: Record<string, SevenTvEmote>;
}

export const ChatCtx = createContext<ChatContextValue | null>(null);
