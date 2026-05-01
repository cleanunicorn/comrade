import { useMemo, useState } from "react";
import { useViewers, type ViewerEntry } from "../twitch/useViewers";
import { useChat } from "../twitch/ChatContext";

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
  const [filter, setFilter] = useState<Filter>("all");

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

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/40">
      <div className="flex flex-col gap-2 border-b border-neutral-800 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Viewers {total > 0 && <span className="text-neutral-500">({total})</span>}
          </h2>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            title={lastFetchAt ? `Updated ${formatAge(Date.now() - lastFetchAt)} ago` : "Refresh"}
            className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "…" : "↻"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1 text-[10px]">
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
            All {merged.length}
          </FilterBtn>
          <FilterBtn active={filter === "following"} onClick={() => setFilter("following")}>
            ❤️ {followCount}
          </FilterBtn>
          <FilterBtn active={filter === "not"} onClick={() => setFilter("not")}>
            👁️ {notCount}
          </FilterBtn>
          <FilterBtn active={filter === "muted"} onClick={() => setFilter("muted")}>
            🔇 {mutedCount}
          </FilterBtn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 text-xs">
        {!loaded && <div className="p-2 text-neutral-500">Loading…</div>}
        {loaded && shown.length === 0 && <div className="p-2 text-neutral-500">No viewers</div>}
        <ul className="space-y-0.5">
          {shown.map((v) => {
            const { emoji, title } = pickEmoji(v);
            return (
              <li
                key={v.user_id}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-neutral-800/50"
              >
                <span title={title} className="shrink-0 text-sm leading-none">
                  {emoji}
                </span>
                <span className={`truncate ${v.isMuted ? "text-neutral-400 italic" : "text-neutral-200"}`}>
                  {v.user_name}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {error && <div className="border-t border-neutral-800 p-2 text-[10px] text-red-400">{error}</div>}
    </div>
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
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-0.5 rounded border px-2 py-0.5 ${
        active
          ? "border-violet-500 bg-violet-600/20 text-violet-200"
          : "border-neutral-700 text-neutral-400 hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}
