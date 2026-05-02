import { useActiveMatch } from "../deadlock/useActiveMatch";
import type { ActivePlayer, HeroInfo } from "../deadlock/api";

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtNetworth(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function PlayerRow({
  player,
  hero,
  isMe,
}: {
  player: ActivePlayer;
  hero?: HeroInfo;
  isMe: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded px-2 py-1 ${
        isMe ? "bg-violet-600/20 ring-1 ring-violet-500/50" : "hover:bg-neutral-800/50"
      }`}
    >
      {hero?.iconSmall ? (
        <img
          src={hero.iconSmall}
          alt={hero.name}
          title={hero.name}
          className="h-6 w-6 shrink-0 rounded"
        />
      ) : (
        <div className="h-6 w-6 shrink-0 rounded bg-neutral-700" />
      )}
      <span className="truncate text-xs text-neutral-200">
        {hero?.name ?? `Hero ${player.hero_id}`}
      </span>
      <span className="ml-auto truncate font-mono text-[10px] text-neutral-500">
        {player.account_id}
      </span>
      {player.abandoned ? (
        <span title="Abandoned" className="text-[10px] text-red-400">
          ⚠
        </span>
      ) : null}
    </div>
  );
}

export function DeadlockHUD() {
  const { match, heroes, loading, error, lastFetchAt, refresh, accountId } = useActiveMatch();

  if (!accountId) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Deadlock
        </h2>
        <div className="text-xs text-neutral-500">
          Set your Steam Account ID in Settings to see live match info.
        </div>
      </div>
    );
  }

  const myAccountIdNum = Number(accountId);
  const team0 = match?.players.filter((p) => p.team === 0) ?? [];
  const team1 = match?.players.filter((p) => p.team === 1) ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-neutral-800 bg-neutral-900/40">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Deadlock
        </h2>
        <div className="flex items-center gap-2">
          {match && (
            <span className="text-[10px] text-neutral-500">
              {match.game_mode_parsed} · {match.match_mode_parsed} · {match.region_mode_parsed}
            </span>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            title={lastFetchAt ? `Updated ${Math.floor((Date.now() - lastFetchAt) / 1000)}s ago` : "Refresh"}
            className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "…" : "↻"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!match ? (
          <div className="text-xs text-neutral-500">
            Not in a match. Polling every 12s…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">
                Time <span className="font-semibold text-neutral-200">{fmtDuration(match.duration_s)}</span>
              </span>
              <span className="font-mono text-neutral-500">match {match.match_id}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded bg-amber-600/15 p-2 ring-1 ring-amber-500/30">
                <div className="text-[10px] uppercase tracking-wider text-amber-400">Amber</div>
                <div className="text-sm font-bold text-neutral-100">
                  {fmtNetworth(match.net_worth_team_0)}
                </div>
              </div>
              <div className="rounded bg-sky-600/15 p-2 ring-1 ring-sky-500/30">
                <div className="text-[10px] uppercase tracking-wider text-sky-400">Sapphire</div>
                <div className="text-sm font-bold text-neutral-100">
                  {fmtNetworth(match.net_worth_team_1)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-amber-400">Amber team</div>
              <div className="space-y-0.5">
                {team0.map((p) => (
                  <PlayerRow
                    key={p.account_id}
                    player={p}
                    hero={heroes[p.hero_id]}
                    isMe={p.account_id === myAccountIdNum}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-sky-400">Sapphire team</div>
              <div className="space-y-0.5">
                {team1.map((p) => (
                  <PlayerRow
                    key={p.account_id}
                    player={p}
                    hero={heroes[p.hero_id]}
                    isMe={p.account_id === myAccountIdNum}
                  />
                ))}
              </div>
            </div>

            {match.spectators > 0 && (
              <div className="text-[10px] text-neutral-500">
                Spectators: {match.spectators}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-neutral-800 p-2 text-[10px] text-red-400">{error}</div>
      )}
    </div>
  );
}
