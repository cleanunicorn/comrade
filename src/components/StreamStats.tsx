import { useStreamInfo } from "../twitch/useStreamInfo";
import { useSettings } from "../settings/useSettings";
import { FontSizer } from "./FontSizer";
import { PanelFrame } from "./PanelFrame";
import { PanelMenu, Row } from "./PanelMenu";

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
    <PanelFrame
      title="▌ Stream"
      menu={
        <PanelMenu>
          <Row label="Font">
            <FontSizer value={fontSize} onChange={(n) => update({ statsFontSize: n })} />
          </Row>
        </PanelMenu>
      }
    >
      <div style={{ fontSize: `${fontSize}px` }}>
        {!stream ? (
          <div className="sw-accent text-[var(--sw-text-faint)]">○ Offline</div>
        ) : (
          <div className="space-y-2">
            <div className="font-semibold text-white">{stream.title}</div>
            <div className="text-[var(--sw-text-dim)]">{stream.game_name}</div>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Stat label="Viewers" value={stream.viewer_count.toLocaleString()} />
              <Stat label="Chatters" value={chatterCount?.toLocaleString() ?? "—"} />
              <Stat label="Uptime" value={fmtUptime(stream.started_at)} />
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sw-stat">
      <div className="sw-stat-label">{label}</div>
      <div className="sw-stat-value">{value}</div>
    </div>
  );
}
