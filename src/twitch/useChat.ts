import { useEffect, useRef, useState } from "react";
import tmi from "tmi.js";
import { useAuth } from "../auth/AuthContext";

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
}

export interface ChatStatus {
  connected: boolean;
  error: string | null;
}

const MAX_MESSAGES = 300;

export function useChat(channel?: string) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>({ connected: false, error: null });
  const clientRef = useRef<tmi.Client | null>(null);

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

    client.on("message", (ch, tags, text, self) => {
      if (self) return;
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
      };
      setMessages((prev) => {
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

  function send(text: string) {
    const c = clientRef.current;
    if (!c || !user) return;
    const target = (channel ?? user.login).toLowerCase();
    c.say(target, text).catch((e) => console.error("send failed", e));
  }

  return { messages, status, send };
}
