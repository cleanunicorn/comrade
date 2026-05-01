const KEY = "comrade.settings";

export interface Settings {
  twitchClientId: string;
  redirectUri: string;
  videoDeviceId: string;
  audioDeviceId: string;
  autoStartMedia: boolean;
  speakThreshold: number;
  silenceNudgeMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  twitchClientId: "",
  redirectUri: typeof window !== "undefined" ? window.location.origin + "/" : "",
  videoDeviceId: "",
  audioDeviceId: "",
  autoStartMedia: false,
  speakThreshold: 0.05,
  silenceNudgeMinutes: 5,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function hasRequiredSettings(s: Settings): boolean {
  return !!s.twitchClientId.trim();
}
