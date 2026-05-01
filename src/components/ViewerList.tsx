import { useState } from "react";
import { useViewers } from "../twitch/useViewers";

type Filter = "all" | "following" | "not";

export function ViewerList() {
  const { viewers, total, loaded, loading, lastFetchAt, error, refresh } = useViewers();
  const [filter, setFilter] = useState<Filter>("all");

  const followCount = viewers.filter((v) => v.follows).length;
  const notCount = viewers.length - followCount;

  const shown =
    filter === "all"
      ? viewers
      : filter === "following"
        ? viewers.filter((v) => v.follows)
        : viewers.filter((v) => !v.follows);

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
        <div className="flex gap-1 text-[10px]">
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
            All {viewers.length}
          </FilterBtn>
          <FilterBtn active={filter === "following"} onClick={() => setFilter("following")}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {followCount}
          </FilterBtn>
          <FilterBtn active={filter === "not"} onClick={() => setFilter("not")}>
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            {notCount}
          </FilterBtn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 text-xs">
        {!loaded && <div className="p-2 text-neutral-500">Loading…</div>}
        {loaded && shown.length === 0 && (
          <div className="p-2 text-neutral-500">No viewers</div>
        )}
        <ul className="space-y-0.5">
          {shown.map((v) => (
            <li key={v.user_id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-neutral-800/50">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  v.follows ? "bg-emerald-500" : "bg-red-500"
                }`}
                title={v.follows ? "Following" : "Not following"}
              />
              <span className="truncate text-neutral-200">{v.user_name}</span>
            </li>
          ))}
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
      className={`flex items-center rounded border px-2 py-0.5 ${
        active
          ? "border-violet-500 bg-violet-600/20 text-violet-200"
          : "border-neutral-700 text-neutral-400 hover:bg-neutral-800"
      }`}
    >
      {children}
    </button>
  );
}
