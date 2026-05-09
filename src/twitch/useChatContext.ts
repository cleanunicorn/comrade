import { useContext } from "react";
import { ChatCtx, type ChatContextValue } from "./chatContextValue";

export function useChat(): ChatContextValue {
  const v = useContext(ChatCtx);
  if (!v) throw new Error("useChat outside ChatProvider");
  return v;
}
