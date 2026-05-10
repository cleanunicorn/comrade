import { useCallback, useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { useAuth } from "../auth/useAuth";
import { loadUser } from "../auth/twitchAuth";
import { useSettings } from "../settings/useSettings";
import { helix } from "./helix";
import { fetch7tvChannel, fetch7tvGlobal, type SevenTvEmote } from "./sevenTv";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cacheKey = (ch: string) => `comrade.chat.cache.${ch.toLowerCase()}`;
const blocksKey = (myUserId: string) => `comrade.blocks.${myUserId}`;
const MAX_BLOCKS = 5000;

function loadCache(ch: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(cacheKey(ch));
    if (!raw) return [];
    const arr = JSON.parse(raw) as ChatMessage[];
    const cutoff = Date.now() - CACHE_TTL_MS;
    return arr.filter((m) => m.ts >= cutoff);
  } catch {
    return [];
  }
}

function saveCache(ch: string, msgs: ChatMessage[]) {
  try {
    localStorage.setItem(cacheKey(ch), JSON.stringify(msgs));
  } catch {
    // quota exceeded — ignore
  }
}

function loadBlocks(myUserId: string): string[] {
  try {
    const raw = localStorage.getItem(blocksKey(myUserId));
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveBlocks(myUserId: string, ids: string[]) {
  try {
    const trimmed = ids.length > MAX_BLOCKS ? ids.slice(ids.length - MAX_BLOCKS) : ids;
    localStorage.setItem(blocksKey(myUserId), JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

export interface ChatMessage {
  id: string;
  channel: string;
  username: string;
  userId: string;
  displayName: string;
  color?: string;
  text: string;
  ts: number;
  isMod: boolean;
  isSub: boolean;
  isBroadcaster: boolean;
  emotes?: { [id: string]: string[] };
}

export interface ChatStatus {
  connected: boolean;
  error: string | null;
}

const MAX_MESSAGES = 300;

export function useChatImpl(channel?: string) {
  const { token, user } = useAuth();
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>({ connected: false, error: null });
  const clientRef = useRef<tmi.Client | null>(null);
  const myColorRef = useRef<string | null>(null);
  const [sevenTvEmotes, setSevenTvEmotes] = useState<Record<string, SevenTvEmote>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(() => {
    const u = loadUser();
    return u ? new Set(loadBlocks(u.id)) : new Set();
  });
  const [selfIsMod, setSelfIsMod] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const targetChannel = ((channel ?? user?.login ?? "") as string).toLowerCase();
  const isBroadcaster = !!user && targetChannel === user.login.toLowerCase();
  const canModerate = isBroadcaster || selfIsMod;

  // Reload persisted blocks if user identity changes after mount
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (lastUserIdRef.current === user.id) return;
    lastUserIdRef.current = user.id;
    setBlockedUserIds(new Set(loadBlocks(user.id)));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const channelUserId = user.id;
    Promise.all([fetch7tvGlobal(), fetch7tvChannel(channelUserId)]).then(([global, ch]) => {
      if (cancelled) return;
      const map: Record<string, SevenTvEmote> = {};
      for (const e of global) map[e.name] = e;
      for (const e of ch) map[e.name] = e;
      setSevenTvEmotes(map);
    });
    return () => {
      cancelled = true;
    };
  }, [user, channel]);

  useEffect(() => {
    if (!token || !user || !settings.twitchClientId) return;
    helix(token.accessToken, settings.twitchClientId)
      .getUserChatColor(user.id)
      .then((c) => {
        myColorRef.current = c;
      })
      .catch(() => {});
  }, [token, user, settings.twitchClientId]);

  useEffect(() => {
    if (!token || !user) return;
    const ch = (channel ?? user.login).toLowerCase();

    // Reset per-channel sets on switch
    /* eslint-disable react-hooks/set-state-in-effect */
    setDeletedIds(new Set());
    setBannedUsers(new Set());
    setSelfIsMod(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    const client = new tmi.Client({
      options: { debug: false, skipUpdatingEmotesets: true },
      connection: { reconnect: true, secure: true },
      identity: {
        username: user.login,
        password: `oauth:${token.accessToken}`,
      },
      channels: [ch],
    });
    clientRef.current = client;

    client.on("connected", () => setStatus({ connected: true, error: null }));
    client.on("disconnected", (reason) =>
      setStatus({ connected: false, error: reason || null }),
    );

    const cached = loadCache(ch);
    if (cached.length > 0) {
      window.setTimeout(() => {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...cached.filter((c) => !seen.has(c.id)), ...prev];
          merged.sort((a, b) => a.ts - b.ts);
          if (merged.length > MAX_MESSAGES) merged.splice(0, merged.length - MAX_MESSAGES);
          return merged;
        });
      }, 0);
    }

    client.on("message", (chName, tags, text, _self) => {
      if (_self) return;
      const msg: ChatMessage = {
        id: tags.id ?? `${Date.now()}-${Math.random()}`,
        channel: chName,
        username: tags.username ?? "anonymous",
        userId: (tags["user-id"] as string | undefined) ?? "",
        displayName: tags["display-name"] ?? tags.username ?? "anonymous",
        color: tags.color ?? undefined,
        text,
        ts: Date.now(),
        isMod: !!tags.mod,
        isSub: !!tags.subscriber,
        isBroadcaster: tags.badges?.broadcaster === "1",
        emotes: (tags.emotes as { [id: string]: string[] } | undefined) ?? undefined,
      };
      setMessages((prev) => {
        if (prev.some((p) => p.id === msg.id)) return prev;
        const next = [...prev, msg];
        if (next.length > MAX_MESSAGES) next.splice(0, next.length - MAX_MESSAGES);
        return next;
      });
    });

    // Track self-mod status from userstate event
    type UserstateTags = { mod?: boolean; badges?: { broadcaster?: string } };
    const onUserstate = (_chName: string, tags: UserstateTags) => {
      const isMod = !!tags.mod || tags.badges?.broadcaster === "1";
      setSelfIsMod(isMod);
    };
    (client as unknown as { on: (e: string, cb: (...args: unknown[]) => void) => void }).on(
      "userstate",
      onUserstate as unknown as (...args: unknown[]) => void,
    );

    // Mirror remote moderation events
    client.on("messagedeleted", (_chName, _username, _msg, tags) => {
      const id = (tags as { "target-msg-id"?: string })["target-msg-id"];
      if (id) setDeletedIds((s) => new Set(s).add(id));
    });
    client.on("ban", (_chName, username) => {
      setBannedUsers((s) => new Set(s).add(username.toLowerCase()));
    });
    client.on("timeout", (_chName, username) => {
      setBannedUsers((s) => new Set(s).add(username.toLowerCase()));
    });

    client.connect().catch((e) => setStatus({ connected: false, error: String(e) }));

    return () => {
      client.removeAllListeners();
      client.disconnect().catch(() => {});
      clientRef.current = null;
    };
  }, [token, user, channel]);

  useEffect(() => {
    if (!user) return;
    const ch = (channel ?? user.login).toLowerCase();
    if (messages.length > 0) saveCache(ch, messages);
  }, [messages, user, channel]);

  function send(text: string) {
    const c = clientRef.current;
    if (!c || !user) return;
    const target = (channel ?? user.login).toLowerCase();
    c.say(target, text)
      .then(() => {
        const msg: ChatMessage = {
          id: `local-${Date.now()}-${Math.random()}`,
          channel: `#${target}`,
          username: user.login,
          userId: user.id,
          displayName: user.display_name,
          color: myColorRef.current ?? undefined,
          text,
          ts: Date.now(),
          isMod: false,
          isSub: false,
          isBroadcaster: target === user.login.toLowerCase(),
        };
        setMessages((prev) => {
          const next = [...prev, msg];
          if (next.length > MAX_MESSAGES) next.splice(0, next.length - MAX_MESSAGES);
          return next;
        });
      })
      .catch((e) => console.error("send failed", e));
  }

  const flashError = useCallback((msg: string) => {
    setActionError(msg);
    window.setTimeout(() => setActionError((cur) => (cur === msg ? null : cur)), 4000);
  }, []);

  const broadcasterId = useRef<string | null>(null);
  useEffect(() => {
    if (!token || !user || !settings.twitchClientId) return;
    if (isBroadcaster) {
      broadcasterId.current = user.id;
      return;
    }
    helix(token.accessToken, settings.twitchClientId)
      .getUsers([])
      .catch(() => {});
    // Resolve channel login -> id
    fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(targetChannel)}`,
      {
        headers: {
          "Client-Id": settings.twitchClientId,
          Authorization: `Bearer ${token.accessToken}`,
        },
      },
    )
      .then((r) => r.json())
      .then((j: { data: Array<{ id: string }> }) => {
        broadcasterId.current = j.data[0]?.id ?? null;
      })
      .catch(() => {});
  }, [token, user, settings.twitchClientId, targetChannel, isBroadcaster]);

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!token || !user || !settings.twitchClientId || !broadcasterId.current) return;
      setDeletedIds((s) => new Set(s).add(messageId));
      try {
        await helix(token.accessToken, settings.twitchClientId).deleteChatMessage(
          broadcasterId.current,
          user.id,
          messageId,
        );
      } catch (e) {
        const err = e as { status?: number; message?: string };
        if (err.status === 404) return; // already deleted
        setDeletedIds((s) => {
          const n = new Set(s);
          n.delete(messageId);
          return n;
        });
        flashError(err.message ?? "Delete failed");
      }
    },
    [token, user, settings.twitchClientId, flashError],
  );

  const banUser = useCallback(
    async (targetUserId: string, login: string, durationSec?: number, reason?: string) => {
      if (!token || !user || !settings.twitchClientId || !broadcasterId.current) return;
      const lc = login.toLowerCase();
      setBannedUsers((s) => new Set(s).add(lc));
      try {
        await helix(token.accessToken, settings.twitchClientId).banUser(
          broadcasterId.current,
          user.id,
          targetUserId,
          { duration: durationSec, reason },
        );
      } catch (e) {
        const err = e as { status?: number; message?: string };
        if (err.status === 400) {
          flashError("Already banned");
          return;
        }
        setBannedUsers((s) => {
          const n = new Set(s);
          n.delete(lc);
          return n;
        });
        flashError(err.message ?? "Ban failed");
      }
    },
    [token, user, settings.twitchClientId, flashError],
  );

  const blockUser = useCallback(
    async (targetUserId: string) => {
      if (!token || !user || !settings.twitchClientId) return;
      setBlockedUserIds((s) => {
        const n = new Set(s).add(targetUserId);
        saveBlocks(user.id, Array.from(n));
        return n;
      });
      try {
        await helix(token.accessToken, settings.twitchClientId).blockUser(targetUserId, {
          sourceContext: "chat",
        });
      } catch (e) {
        const err = e as { status?: number; message?: string };
        setBlockedUserIds((s) => {
          const n = new Set(s);
          n.delete(targetUserId);
          saveBlocks(user.id, Array.from(n));
          return n;
        });
        flashError(err.message ?? "Block failed");
      }
    },
    [token, user, settings.twitchClientId, flashError],
  );

  return {
    messages,
    status,
    send,
    sevenTvEmotes,
    canModerate,
    deletedIds,
    bannedUsers,
    blockedUserIds,
    deleteMessage,
    banUser,
    blockUser,
    actionError,
  };
}
