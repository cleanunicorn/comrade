import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChat } from "../twitch/ChatContext";
import { type ChatMessage } from "../twitch/useChat";
import { emoteUrl, type SevenTvEmote } from "../twitch/sevenTv";

function renderTextWith7tv(
  text: string,
  sevenTv: Record<string, SevenTvEmote>,
  keyBase: string,
): ReactNode[] {
  if (!text || Object.keys(sevenTv).length === 0) return [text];
  const tokens = text.split(/(\s+)/);
  return tokens.map((tok, i) => {
    const e = sevenTv[tok];
    if (!e) return tok;
    return (
      <img
        key={`${keyBase}-7tv-${i}`}
        src={emoteUrl(e.id, 2)}
        alt={tok}
        title={tok}
        className="inline-block h-6 align-middle"
      />
    );
  });
}

function renderMessage(m: ChatMessage, sevenTv: Record<string, SevenTvEmote>): ReactNode[] {
  const text = m.text;
  const twitchSegs: { start: number; end: number; id: string }[] = [];
  if (m.emotes) {
    for (const [id, ranges] of Object.entries(m.emotes)) {
      for (const r of ranges) {
        const [s, e] = r.split("-").map(Number);
        twitchSegs.push({ start: s, end: e + 1, id });
      }
    }
    twitchSegs.sort((a, b) => a.start - b.start);
  }

  const out: ReactNode[] = [];
  let cur = 0;
  twitchSegs.forEach((seg, i) => {
    if (cur < seg.start) {
      out.push(...renderTextWith7tv(text.slice(cur, seg.start), sevenTv, `${m.id}-pre${i}`));
    }
    const name = text.slice(seg.start, seg.end);
    out.push(
      <img
        key={`${m.id}-tw-${i}`}
        src={`https://static-cdn.jtvnw.net/emoticons/v2/${seg.id}/default/dark/1.0`}
        alt={name}
        title={name}
        className="inline-block h-6 align-middle"
      />,
    );
    cur = seg.end;
  });
  if (cur < text.length) {
    out.push(...renderTextWith7tv(text.slice(cur), sevenTv, `${m.id}-tail`));
  }
  return out;
}

export function ChatPanel() {
  const { messages, status, send, sevenTvEmotes } = useChat();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    send(draft.trim());
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-800 bg-neutral-900/40">
      <div className="flex items-center justify-between border-b border-neutral-800 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Chat</h2>
        <span className={`text-xs ${status.connected ? "text-emerald-400" : "text-neutral-500"}`}>
          {status.connected ? "● live" : "○ disconnected"}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {messages.length === 0 && (
          <div className="text-neutral-500">Waiting for messages…</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="break-words">
            <span className="font-semibold" style={{ color: m.color || "#bf94ff" }}>
              {m.isBroadcaster && "👑 "}
              {m.isMod && "🛡 "}
              {m.displayName}
            </span>
            <span className="text-neutral-300">: {renderMessage(m, sevenTvEmotes)}</span>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-neutral-800 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Send to chat…"
          className="flex-1 rounded bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={!status.connected}
          className="rounded bg-violet-600 px-3 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-violet-500"
        >
          Send
        </button>
      </form>

      {status.error && <div className="border-t border-neutral-800 p-2 text-xs text-red-400">{status.error}</div>}
    </div>
  );
}
