import { createContext } from "react";
import type { SevenTvEmote } from "./sevenTv";
import type { ChatMessage, ChatStatus } from "./useChat";

export interface ChatContextValue {
  messages: ChatMessage[];
  status: ChatStatus;
  send: (text: string) => void;
  sevenTvEmotes: Record<string, SevenTvEmote>;
  canModerate: boolean;
  bannedUsers: Set<string>;
  blockedUserIds: Set<string>;
  deleteMessage: (messageId: string) => Promise<void>;
  banUser: (
    targetUserId: string,
    login: string,
    durationSec?: number,
    reason?: string,
  ) => Promise<void>;
  blockUser: (targetUserId: string) => Promise<void>;
  actionError: string | null;
}

export const ChatCtx = createContext<ChatContextValue | null>(null);
