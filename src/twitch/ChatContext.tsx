import { createContext, useContext, type ReactNode } from "react";
import { useChatImpl, type ChatMessage, type ChatStatus } from "./useChat";
import type { SevenTvEmote } from "./sevenTv";

interface ChatContextValue {
  messages: ChatMessage[];
  status: ChatStatus;
  send: (text: string) => void;
  sevenTvEmotes: Record<string, SevenTvEmote>;
}

const Ctx = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children, channel }: { children: ReactNode; channel?: string }) {
  const value = useChatImpl(channel);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChat(): ChatContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChat outside ChatProvider");
  return v;
}
