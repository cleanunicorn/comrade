import { useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { useAuth } from "../auth/useAuth";
import { useSettings } from "../settings/useSettings";
import { helix } from "./helix";
import { fetch7tvChannel, fetch7tvGlobal, type SevenTvEmote } from "./sevenTv";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cacheKey = (ch: string) => `comrade.chat.cache.${ch.toLowerCase()}`;

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

export interface ChatMessage {
  id: string;
  channel: string;
  username: string;
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
    const targetChannel = (channel ?? user.login).toLowerCase();

    const client = new tmi.Client({
      options: { debug: false, skipUpdatingEmotesets: true },
      connection: { reconnect: true, secure: true },
      identity: {
        username: user.login,
        password: `oauth:${token.accessToken}`,
      },
      channels: [targetChannel],
    });
    clientRef.current = client;

    client.on("connected", () => setStatus({ connected: true, error: null }));
    client.on("disconnected", (reason) =>
      setStatus({ connected: false, error: reason || null }),
    );

    const cached = loadCache(targetChannel);
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

    client.on("message", (ch, tags, text, _self) => {
      if (_self) return;
      const msg: ChatMessage = {
        id: tags.id ?? `${Date.now()}-${Math.random()}`,
        channel: ch,
        username: tags.username ?? "anonymous",
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

    client.connect().catch((e) => setStatus({ connected: false, error: String(e) }));

    return () => {
      client.removeAllListeners();
      client.disconnect().catch(() => {});
      clientRef.current = null;
    };
  }, [token, user, channel]);

  useEffect(() => {
    if (!user) return;
    const targetChannel = (channel ?? user.login).toLowerCase();
    if (messages.length > 0) saveCache(targetChannel, messages);
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

  return { messages, status, send, sevenTvEmotes };
}
