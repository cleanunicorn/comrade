import { useEffect, useRef, useState } from "react";
import { useMedia } from "../media/useMedia";
import { useDevices } from "../media/useDevices";
import { useSettings } from "../settings/SettingsContext";

export function CamPanel() {
  const { settings, update } = useSettings();
  const devices = useDevices();
  const media = useMedia({
    audio: settings.enableAudio,
    video: settings.enableVideo,
    videoDeviceId: settings.videoDeviceId || undefined,
    audioDeviceId: settings.audioDeviceId || undefined,
  });
  const bothDisabled = !settings.enableAudio && !settings.enableVideo;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && media.stream) {
      videoRef.current.srcObject = media.stream;
    }
  }, [media.stream]);

  useEffect(() => {
    if (media.active) {
      media.stop();
      if (bothDisabled) return;
      const t = setTimeout(() => media.start(), 50);
      return () => clearTimeout(t);
    }
  }, [settings.videoDeviceId, settings.audioDeviceId, settings.enableVideo, settings.enableAudio, bothDisabled]);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (settings.autoStartMedia && !autoStartedRef.current && !media.active && !bothDisabled) {
      autoStartedRef.current = true;
      media.start();
    }
  }, [settings.autoStartMedia, media.active, media.start]);

  const SCALE = 400;
  const levelPct = Math.min(100, Math.round(media.audioLevel * SCALE));
  const thresholdPct = Math.min(100, Math.round(settings.speakThreshold * SCALE));

  const [lastSpokeAt, setLastSpokeAt] = useState<number | null>(null);
  useEffect(() => {
    if (media.active && media.audioLevel > settings.speakThreshold) {
      setLastSpokeAt(Date.now());
    }
  }, [media.audioLevel, media.active, settings.speakThreshold]);

  useEffect(() => {
    if (!media.active) setLastSpokeAt(null);
  }, [media.active]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const silentMs = lastSpokeAt ? now - lastSpokeAt : null;
  const nudgeMs = settings.silenceNudgeSeconds * 1000;
  const shouldNudge = media.active && silentMs != null && silentMs >= nudgeMs;

  const prevNudgeRef = useRef(false);
  useEffect(() => {
    if (shouldNudge && !prevNudgeRef.current) {
      update({ nudgeCount: settings.nudgeCount + 1 });
    }
    prevNudgeRef.current = shouldNudge;
  }, [shouldNudge, settings.nudgeCount, update]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Camera + Mic</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-neutral-400 select-none">
            <input
              type="checkbox"
              checked={settings.autoStartMedia}
              onChange={(e) => update({ autoStartMedia: e.target.checked })}
              className="h-3.5 w-3.5 accent-violet-500"
            />
            Auto-start
          </label>
          {media.active ? (
            <button onClick={media.stop} className="rounded bg-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-500">
              Stop
            </button>
          ) : (
            <button
              onClick={media.start}
              disabled={bothDisabled}
              title={bothDisabled ? "Enable cam or mic first" : ""}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              Start
            </button>
          )}
        </div>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        {!media.active && (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
            Camera off
          </div>
        )}
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
          label="Microphone"
          devices={devices.mics}
          value={settings.audioDeviceId}
          onChange={(id) => update({ audioDeviceId: id })}
          placeholderLabel="Microphone"
          enabled={settings.enableAudio}
          onToggleEnabled={(v) => update({ enableAudio: v })}
        />
        {!devices.permissionGranted && (
          <button
            onClick={devices.requestPermission}
            className="rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Grant device access to see names
          </button>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
          <span>Mic level {levelPct}</span>
          <span className="text-neutral-500">threshold {thresholdPct}</span>
        </div>
        <div className="relative h-9 w-full overflow-hidden rounded bg-neutral-800">
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500 transition-[width] duration-75"
            style={{ width: `${levelPct * 2}%` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-amber-300/70"
            style={{ left: `${thresholdPct}%` }}
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

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-neutral-400">
          {lastSpokeAt
            ? `Last spoke ${formatDuration(silentMs!)} ago`
            : media.active
              ? "Waiting to detect speech…"
              : "Mic off"}
        </span>
        <span className="flex items-center gap-1 text-neutral-400">
          Nudges: <span className="font-semibold text-neutral-200">{settings.nudgeCount}</span>
          <button
            type="button"
            onClick={() => update({ nudgeCount: 0 })}
            className="ml-1 rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-400 hover:bg-neutral-800"
          >
            Reset
          </button>
        </span>
        <label className="flex items-center gap-1 text-neutral-400">
          Nudge after
          <input
            type="number"
            min={1}
            max={3600}
            value={settings.silenceNudgeSeconds}
            onChange={(e) =>
              update({ silenceNudgeSeconds: Math.max(1, parseInt(e.target.value || "1", 10)) })
            }
            className="w-16 rounded bg-neutral-800 px-2 py-1 text-right text-xs text-neutral-200 outline-none focus:ring-2 focus:ring-violet-500"
          />
          sec
        </label>
      </div>

      {shouldNudge && (
        <div className="nudge-flash pointer-events-none fixed inset-0 z-50 flex items-start justify-center pt-8">
          <div className="rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-2xl">
            Silent {formatDuration(silentMs!)} — talk to chat!
          </div>
        </div>
      )}

      {media.error && <div className="text-xs text-red-400">{media.error}</div>}
      {devices.error && <div className="text-xs text-red-400">{devices.error}</div>}
    </div>
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
        className="h-3.5 w-3.5 shrink-0 accent-violet-500"
      />
      <span className={`w-16 shrink-0 ${enabled ? "text-neutral-400" : "text-neutral-600 line-through"}`}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!enabled}
        className="min-w-0 flex-1 truncate rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-200 outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40"
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
