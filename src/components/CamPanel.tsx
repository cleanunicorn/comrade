import { useEffect, useRef, useState } from "react";
import { useMedia } from "../media/useMedia";
import { useDevices } from "../media/useDevices";
import { useSettings } from "../settings/useSettings";
import { FontSizer } from "./FontSizer";
import { PanelFrame } from "./PanelFrame";

export function CamPanel() {
  const { settings, update } = useSettings();
  const devices = useDevices();
  const media = useMedia({
    audio: settings.enableAudio,
    video: settings.enableVideo,
    videoDeviceId: settings.videoDeviceId || undefined,
    audioDeviceId: settings.audioDeviceId || undefined,
  });
  const { active, audioLevel, start, stop, stream } = media;
  const bothDisabled = !settings.enableAudio && !settings.enableVideo;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const startRef = useRef(start);
  const stopRef = useRef(stop);
  useEffect(() => {
    startRef.current = start;
    stopRef.current = stop;
  }, [start, stop]);

  useEffect(() => {
    if (!activeRef.current) return;
    stopRef.current();
    if (bothDisabled) return;
    const t = setTimeout(() => {
      void startRef.current();
    }, 50);
    return () => clearTimeout(t);
  }, [settings.videoDeviceId, settings.audioDeviceId, settings.enableVideo, settings.enableAudio, bothDisabled]);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (settings.autoStartMedia && !autoStartedRef.current && !active && !bothDisabled) {
      autoStartedRef.current = true;
      start();
    }
  }, [settings.autoStartMedia, active, start, bothDisabled]);

  const SCALE = 400;
  const levelPct = Math.min(100, Math.round(audioLevel * SCALE));
  const thresholdPct = Math.min(100, Math.round(settings.speakThreshold * SCALE));

  const [lastSpokeAt, setLastSpokeAt] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      if (!active) setLastSpokeAt(null);
      else if (audioLevel > settings.speakThreshold) setLastSpokeAt(Date.now());
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [audioLevel, active, settings.speakThreshold]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const silentMs = lastSpokeAt ? now - lastSpokeAt : null;
  const nudgeMs = settings.silenceNudgeSeconds * 1000;
  const shouldNudge = active && silentMs != null && silentMs >= nudgeMs;

  const prevNudgeRef = useRef(false);
  useEffect(() => {
    if (shouldNudge && !prevNudgeRef.current) {
      update({ nudgeCount: settings.nudgeCount + 1 });
    }
    prevNudgeRef.current = shouldNudge;
  }, [shouldNudge, settings.nudgeCount, update]);

  const controls = (
    <>
      <FontSizer value={settings.camFontSize} onChange={(n) => update({ camFontSize: n })} />
      <label className="sw-accent flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--sw-text-dim)] select-none">
        <input
          type="checkbox"
          checked={settings.autoStartMedia}
          onChange={(e) => update({ autoStartMedia: e.target.checked })}
          className="sw-checkbox h-3.5 w-3.5"
        />
        Auto
      </label>
      {active ? (
        <button onClick={stop} className="btn btn-danger btn-sm">■ Stop</button>
      ) : (
        <button
          onClick={start}
          disabled={bothDisabled}
          title={bothDisabled ? "Enable cam or mic first" : ""}
          className="btn btn-success btn-sm"
        >
          ▶ Start
        </button>
      )}
    </>
  );

  return (
    <PanelFrame title="▌ Cam ∙ Mic" controls={controls}>
      <div className="flex flex-col gap-3" style={{ fontSize: `${settings.camFontSize}px` }}>
        <div className="relative aspect-video overflow-hidden rounded-sm border border-[rgba(0,240,255,0.35)] bg-black shadow-[0_0_16px_rgba(0,240,255,0.25)]">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          {!active && (
            <div className="absolute inset-0 flex items-center justify-center sw-accent text-[var(--sw-text-faint)]">
              ◌ Camera Off
            </div>
          )}
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 sw-accent text-[9px]">
            <span className={`sw-dot ${active ? "live" : ""}`} />
            {active ? "REC" : "STBY"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <DevicePicker
            label="Camera"
            devices={devices.cameras}
            value={settings.videoDeviceId}
            onChange={(id) => update({ videoDeviceId: id })}
            placeholderLabel="Camera"
            enabled={settings.enableVideo}
            onToggleEnabled={(v) => update({ enableVideo: v })}
          />
          <DevicePicker
            label="Mic"
            devices={devices.mics}
            value={settings.audioDeviceId}
            onChange={(id) => update({ audioDeviceId: id })}
            placeholderLabel="Microphone"
            enabled={settings.enableAudio}
            onToggleEnabled={(v) => update({ enableAudio: v })}
          />
          {!devices.permissionGranted && (
            <button onClick={devices.requestPermission} className="btn btn-ghost btn-sm">
              Grant device access
            </button>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between sw-accent text-[9px]">
            <span>Mic Lv <span className="sw-num text-[var(--sw-cyan)]">{levelPct}</span></span>
            <span className="text-[var(--sw-yellow)]">▲ Threshold <span className="sw-num">{thresholdPct}</span></span>
          </div>
          <div className="relative h-9 w-full overflow-hidden rounded-sm border border-[rgba(0,240,255,0.30)] bg-[rgba(7,0,15,0.6)]">
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-75"
              style={{
                width: `${levelPct * 2}%`,
                background: "linear-gradient(90deg, var(--sw-cyan), var(--sw-pink))",
                boxShadow: "0 0 12px rgba(255,32,121,0.6)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 w-px"
              style={{ left: `${thresholdPct}%`, background: "var(--sw-yellow)", boxShadow: "0 0 6px var(--sw-yellow)" }}
            />
            <input
              type="range"
              min={0}
              max={0.25}
              step={0.0025}
              value={settings.speakThreshold}
              onChange={(e) => update({ speakThreshold: parseFloat(e.target.value) })}
              className="threshold-slider absolute inset-0 w-full"
              aria-label="Speech threshold"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sw-mono text-[11px] text-[var(--sw-text-dim)]">
          <span>
            {lastSpokeAt
              ? <>Spoke <span className="sw-num text-[var(--sw-cyan)]">{formatDuration(silentMs!)}</span> ago</>
              : active
                ? "Listening…"
                : "Mic off"}
          </span>
          <span className="flex items-center gap-1">
            Nudges <span className="sw-num text-[var(--sw-pink)]">{settings.nudgeCount}</span>
            <button
              type="button"
              onClick={() => update({ nudgeCount: 0 })}
              className="btn btn-ghost btn-sm"
            >
              Reset
            </button>
          </span>
          <label className="flex items-center gap-1">
            After
            <input
              type="number"
              min={1}
              max={3600}
              value={settings.silenceNudgeSeconds}
              onChange={(e) =>
                update({ silenceNudgeSeconds: Math.max(1, parseInt(e.target.value || "1", 10)) })
              }
              className="sw-input w-16 text-right text-xs"
            />
            sec
          </label>
        </div>

        {shouldNudge && (
          <div className="nudge-flash pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-8">
            <div className="sw-accent rounded-sm border border-[var(--sw-pink)] bg-[rgba(255,32,121,0.85)] px-6 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(255,32,121,0.85)]">
              ▲ Silent {formatDuration(silentMs!)} — Engage Chat
            </div>
          </div>
        )}

        {media.error && <div className="sw-mono text-xs text-[var(--sw-danger)]">{media.error}</div>}
        {devices.error && <div className="sw-mono text-xs text-[var(--sw-danger)]">{devices.error}</div>}
      </div>
    </PanelFrame>
  );
}

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

interface DevicePickerProps {
  label: string;
  devices: MediaDeviceInfo[];
  value: string;
  onChange: (id: string) => void;
  placeholderLabel: string;
  enabled: boolean;
  onToggleEnabled: (v: boolean) => void;
}

function DevicePicker({
  label,
  devices,
  value,
  onChange,
  placeholderLabel,
  enabled,
  onToggleEnabled,
}: DevicePickerProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggleEnabled(e.target.checked)}
        title={enabled ? `Disable ${label.toLowerCase()}` : `Enable ${label.toLowerCase()}`}
        className="sw-checkbox h-3.5 w-3.5 shrink-0"
      />
      <span className={`sw-accent w-14 shrink-0 text-[10px] ${enabled ? "text-[var(--sw-cyan)]" : "text-[var(--sw-text-faint)] line-through"}`}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!enabled}
        className="sw-select min-w-0 flex-1 truncate text-xs disabled:opacity-40"
      >
        <option value="">Default {placeholderLabel.toLowerCase()}</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `${placeholderLabel} (${d.deviceId.slice(0, 6)}…)`}
          </option>
        ))}
      </select>
    </div>
  );
}
