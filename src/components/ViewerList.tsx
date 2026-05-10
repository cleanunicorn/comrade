import { useEffect, useMemo, useState } from "react";
import { useViewers, type ViewerEntry } from "../twitch/useViewers";
import { useChat } from "../twitch/useChatContext";
import { useSettings } from "../settings/useSettings";
import { FontSizer } from "./FontSizer";
import { PanelFrame } from "./PanelFrame";
import { PanelMenu, Row } from "./PanelMenu";

type Filter = "all" | "following" | "not" | "muted";

interface MergedViewer extends ViewerEntry {
  isMod: boolean;
  isBroadcaster: boolean;
  isMuted: boolean;
}

function pickEmoji(v: MergedViewer): { emoji: string; title: string } {
  if (v.isBroadcaster) return { emoji: "👑", title: "Broadcaster" };
  if (v.isMod) return { emoji: "🛡️", title: "Moderator" };
  if (v.isMuted && v.follows) return { emoji: "🔇", title: "Muted (chatting, not viewing) — follows" };
  if (v.isMuted) return { emoji: "🔇", title: "Muted (chatting, not viewing)" };
  if (v.follows) return { emoji: "❤️", title: "Following" };
  return { emoji: "👁️", title: "Viewer" };
}

export function ViewerList() {
  const { viewers, total, loaded, loading, lastFetchAt, error, refresh } = useViewers();
  const { messages } = useChat();
  const { settings, update } = useSettings();
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const merged = useMemo<MergedViewer[]>(() => {
    const byLogin = new Map<string, MergedViewer>();
    for (const v of viewers) {
      byLogin.set(v.user_login.toLowerCase(), {
        ...v,
        isMod: false,
        isBroadcaster: false,
        isMuted: false,
      });
    }

    // walk messages newest-first, derive role flags + add muted (chat-only) entries
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const login = m.username.toLowerCase();
      const existing = byLogin.get(login);
      if (existing) {
        if (m.isMod) existing.isMod = true;
        if (m.isBroadcaster) existing.isBroadcaster = true;
      } else {
        // chatted but not in /chat/chatters → muted
        byLogin.set(login, {
          user_id: `chat-${login}`,
          user_login: login,
          user_name: m.displayName,
          follows: false, // unknown — could enhance with per-user check
          isMod: m.isMod,
          isBroadcaster: m.isBroadcaster,
          isMuted: true,
        });
      }
    }

    const arr = Array.from(byLogin.values());
    arr.sort((a, b) => {
      const rank = (x: MergedViewer) =>
        x.isBroadcaster ? 0 : x.isMod ? 1 : x.isMuted ? 4 : x.follows ? 2 : 3;
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return a.user_login.localeCompare(b.user_login);
    });
    return arr;
  }, [viewers, messages]);

  const followCount = merged.filter((v) => v.follows && !v.isMuted).length;
  const notCount = merged.filter((v) => !v.follows && !v.isMuted).length;
  const mutedCount = merged.filter((v) => v.isMuted).length;

  const shown =
    filter === "all"
      ? merged
      : filter === "following"
        ? merged.filter((v) => v.follows && !v.isMuted)
        : filter === "muted"
          ? merged.filter((v) => v.isMuted)
          : merged.filter((v) => !v.follows && !v.isMuted);

  const menu = (
    <PanelMenu>
      <Row label="Font">
        <FontSizer
          value={settings.viewersFontSize}
          onChange={(n) => update({ viewersFontSize: n })}
        />
      </Row>
    </PanelMenu>
  );

  const controls = (
    <button
      type="button"
      onClick={refresh}
      disabled={loading}
      title={lastFetchAt ? `Updated ${formatAge(now - lastFetchAt)} ago` : "Refresh"}
      className="btn btn-ghost btn-sm"
    >
      {loading ? "…" : "↻"}
    </button>
  );

  return (
    <PanelFrame
      title={`▌ Viewers${total > 0 ? ` · ${total}` : ""}`}
      menu={menu}
      controls={controls}
      flush
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap gap-1 border-b border-[rgba(0,240,255,0.20)] p-2">
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
            All {merged.length}
          </FilterBtn>
          <FilterBtn active={filter === "following"} onClick={() => setFilter("following")}>
            ❤ {followCount}
          </FilterBtn>
          <FilterBtn active={filter === "not"} onClick={() => setFilter("not")}>
            👁 {notCount}
          </FilterBtn>
          <FilterBtn active={filter === "muted"} onClick={() => setFilter("muted")}>
            🔇 {mutedCount}
          </FilterBtn>
        </div>
        <div className="flex-1 overflow-y-auto p-2" style={{ fontSize: `${settings.viewersFontSize}px` }}>
          {!loaded && <div className="p-2 sw-mono text-[var(--sw-text-faint)]">Loading…</div>}
          {loaded && shown.length === 0 && <div className="p-2 sw-mono text-[var(--sw-text-faint)]">No viewers</div>}
          <ul className="space-y-0.5">
            {shown.map((v) => {
              const { emoji, title } = pickEmoji(v);
              return (
                <li
                  key={v.user_id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[rgba(255,32,121,0.10)]"
                >
                  <span title={title} className="shrink-0 text-sm leading-none">
                    {emoji}
                  </span>
                  <span className={`truncate ${v.isMuted ? "italic text-[var(--sw-text-faint)]" : "text-[var(--sw-text)]"}`}>
                    {v.user_name}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {error && (
          <div className="border-t border-[rgba(255,56,89,0.4)] p-2 text-[10px] text-[var(--sw-danger)] sw-mono">
            {error}
          </div>
        )}
      </div>
    </PanelFrame>
  );
}

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={`sw-chip ${active ? "is-active" : ""}`}>
      {children}
    </button>
  );
}
