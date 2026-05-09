import { useStreamInfo } from "../twitch/useStreamInfo";
import { useSettings } from "../settings/useSettings";
import { FontSizer } from "./FontSizer";

function fmtUptime(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function StreamStats() {
  const { stream, chatterCount } = useStreamInfo();
  const { settings, update } = useSettings();
  const fontSize = settings.statsFontSize;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4" style={{ fontSize: `${fontSize}px` }}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Stream</h2>
        <FontSizer value={fontSize} onChange={(n) => update({ statsFontSize: n })} />
      </div>

      {!stream ? (
        <div className="text-neutral-500">Offline</div>
      ) : (
        <div className="space-y-2">
          <div className="font-semibold text-white">{stream.title}</div>
          <div className="text-neutral-400">{stream.game_name}</div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Stat label="Viewers" value={stream.viewer_count.toLocaleString()} />
            <Stat label="Chatters" value={chatterCount?.toLocaleString() ?? "—"} />
            <Stat label="Uptime" value={fmtUptime(stream.started_at)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-neutral-800/60 p-2 text-center">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}
