import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useChat } from "../twitch/useChatContext";
import { type ChatMessage } from "../twitch/useChat";
import { emoteUrl, type SevenTvEmote } from "../twitch/sevenTv";
import { useSettings } from "../settings/useSettings";
import { useAuth } from "../auth/useAuth";
import { FontSizer } from "./FontSizer";
import { ChatMessageActions } from "./ChatMessageActions";
import { PanelFrame } from "./PanelFrame";

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
  const {
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
  } = useChat();
  const { settings, update } = useSettings();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fontSize = settings.chatFontSize;

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          !deletedIds.has(m.id) &&
          !blockedUserIds.has(m.userId) &&
          !bannedUsers.has(m.username),
      ),
    [messages, deletedIds, blockedUserIds, bannedUsers],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [visibleMessages]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    send(draft.trim());
    setDraft("");
  }

  const controls = (
    <>
      <FontSizer value={fontSize} onChange={(n) => update({ chatFontSize: n })} />
      <span className={`sw-accent text-[10px] ${status.connected ? "text-[var(--sw-success)]" : "text-[var(--sw-text-faint)]"}`}>
        <span className={`sw-dot ${status.connected ? "live" : ""}`} />
        {status.connected ? "Live" : "Offline"}
      </span>
    </>
  );

  return (
    <PanelFrame title="▌ Chat" controls={controls} flush>
      <div className="flex h-full min-h-0 flex-col">
        <div
          ref={scrollRef}
          className="flex-1 space-y-1 overflow-y-auto p-3"
          style={{ fontSize: `${fontSize}px` }}
        >
          {visibleMessages.length === 0 && (
            <div className="sw-mono text-[var(--sw-text-faint)]">— Waiting for transmission —</div>
          )}
          {visibleMessages.map((m) => {
            const isSelf = !!user && m.username === user.login.toLowerCase();
            const showActions = canModerate && !isSelf && !m.isBroadcaster;
            return (
              <div key={m.id} className="group flex items-start justify-between gap-2 break-words">
                <div className="min-w-0 flex-1">
                  <span
                    className="font-semibold"
                    style={{
                      color: m.color || "#ff7adc",
                      textShadow: `0 0 6px ${m.color || "#ff7adc"}55`,
                    }}
                  >
                    {m.isBroadcaster && "👑 "}
                    {m.isMod && "🛡 "}
                    {m.displayName}
                  </span>
                  <span className="text-[var(--sw-text)]">: {renderMessage(m, sevenTvEmotes)}</span>
                </div>
                {showActions && (
                  <ChatMessageActions
                    username={m.username}
                    onDelete={() => void deleteMessage(m.id)}
                    onTimeout={(sec) => void banUser(m.userId, m.username, sec)}
                    onBan={(reason) => void banUser(m.userId, m.username, undefined, reason)}
                    onBlock={() => void blockUser(m.userId)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2 border-t border-[rgba(255,32,121,0.40)] bg-[rgba(7,0,15,0.5)] p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="> transmit…"
            className="sw-input flex-1 text-sm"
          />
          <button type="submit" disabled={!status.connected} className="btn btn-primary">
            Send ▶
          </button>
        </form>

        {(status.error || actionError) && (
          <div className="sw-mono border-t border-[rgba(255,56,89,0.4)] p-2 text-xs text-[var(--sw-danger)]">
            {actionError ?? status.error}
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
