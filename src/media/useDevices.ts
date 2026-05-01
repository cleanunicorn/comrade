import { useCallback, useEffect, useState } from "react";

export interface DeviceList {
  cameras: MediaDeviceInfo[];
  mics: MediaDeviceInfo[];
  permissionGranted: boolean;
  error: string | null;
}

async function probePermission(kind: "video" | "audio"): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(
      kind === "video" ? { video: true } : { audio: true },
    );
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export function useDevices() {
  const [state, setState] = useState<DeviceList>({
    cameras: [],
    mics: [],
    permissionGranted: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cameras = list.filter((d) => d.kind === "videoinput");
      const mics = list.filter((d) => d.kind === "audioinput");
      const labelled = cameras.some((d) => d.label) || mics.some((d) => d.label);
      setState({ cameras, mics, permissionGranted: labelled, error: null });
    } catch (e) {
      setState((s) => ({ ...s, error: String(e) }));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const ok = (await probePermission("video")) || (await probePermission("audio"));
    if (!ok) {
      setState((s) => ({ ...s, error: "Permission denied" }));
      return;
    }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    navigator.mediaDevices.addEventListener?.("devicechange", handler);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", handler);
  }, [refresh]);

  return { ...state, refresh, requestPermission };
}
