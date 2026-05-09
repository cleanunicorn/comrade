import { type ReactNode } from "react";
import { useChatImpl } from "./useChat";
import { ChatCtx } from "./chatContextValue";

export function ChatProvider({ children, channel }: { children: ReactNode; channel?: string }) {
  const value = useChatImpl(channel);
  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}
