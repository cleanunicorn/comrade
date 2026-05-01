import { useCallback, useEffect, useRef, useState } from "react";

export interface MediaState {
  stream: MediaStream | null;
  audioLevel: number;
  error: string | null;
  active: boolean;
}

export interface MediaOptions {
  audio: boolean;
  video: boolean;
  videoDeviceId?: string;
  audioDeviceId?: string;
}

export function useMedia(opts: MediaOptions) {
  const [state, setState] = useState<MediaState>({
    stream: null,
    audioLevel: 0,
    error: null,
    active: false,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState({ stream: null, audioLevel: 0, error: null, active: false });
  }, []);

  const start = useCallback(async () => {
    try {
      const audioConstraint: MediaTrackConstraints | boolean = opts.audio
        ? opts.audioDeviceId
          ? { deviceId: { exact: opts.audioDeviceId } }
          : true
        : false;

      const videoConstraint: MediaTrackConstraints | boolean = opts.video
        ? {
            width: 640,
            height: 360,
            ...(opts.videoDeviceId ? { deviceId: { exact: opts.videoDeviceId } } : {}),
          }
        : false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: videoConstraint,
      });
      streamRef.current = stream;

      if (opts.audio) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        src.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const buf = new Uint8Array(analyser.fftSize);
        const loop = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          setState((s) => ({ ...s, audioLevel: rms }));
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      }

      setState({ stream, audioLevel: 0, error: null, active: true });
    } catch (e) {
      setState({ stream: null, audioLevel: 0, error: String(e), active: false });
    }
  }, [opts.audio, opts.video, opts.videoDeviceId, opts.audioDeviceId]);

  useEffect(() => () => stop(), [stop]);

  return { ...state, start, stop };
}
