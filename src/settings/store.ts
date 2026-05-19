const KEY = "comrade.settings";

export interface PanelLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export type PanelLayouts = Record<string, PanelLayoutItem[]>;

export const PANEL_IDS = ["cam", "stats", "summary", "viewers", "chat"] as const;
export type PanelId = (typeof PANEL_IDS)[number];

export const DEFAULT_PANEL_LAYOUTS: PanelLayouts = {
  lg: [
    { i: "cam",     x: 0,  y: 0, w: 4, h: 14, minW: 3, minH: 8 },
    { i: "stats",   x: 0,  y: 14, w: 4, h: 5,  minW: 3, minH: 4 },
    { i: "summary", x: 0,  y: 19, w: 4, h: 9,  minW: 3, minH: 6 },
    { i: "viewers", x: 4,  y: 0, w: 2, h: 28, minW: 2, minH: 6 },
    { i: "chat",    x: 6,  y: 0, w: 6, h: 28, minW: 3, minH: 8 },
  ],
  md: [
    { i: "cam",     x: 0, y: 0,  w: 5, h: 14, minW: 3, minH: 8 },
    { i: "stats",   x: 5, y: 0,  w: 5, h: 5,  minW: 3, minH: 4 },
    { i: "summary", x: 5, y: 5,  w: 5, h: 9,  minW: 3, minH: 6 },
    { i: "viewers", x: 0, y: 14, w: 4, h: 14, minW: 2, minH: 6 },
    { i: "chat",    x: 4, y: 14, w: 6, h: 14, minW: 3, minH: 8 },
  ],
  sm: [
    { i: "cam",     x: 0, y: 0,  w: 6, h: 14, minW: 3, minH: 8 },
    { i: "stats",   x: 0, y: 14, w: 6, h: 5,  minW: 3, minH: 4 },
    { i: "chat",    x: 0, y: 19, w: 6, h: 16, minW: 3, minH: 8 },
    { i: "viewers", x: 0, y: 35, w: 6, h: 10, minW: 2, minH: 6 },
    { i: "summary", x: 0, y: 45, w: 6, h: 10, minW: 3, minH: 6 },
  ],
};

export interface Settings {
  twitchClientId: string;
  redirectUri: string;
  videoDeviceId: string;
  audioDeviceId: string;
  autoStartMedia: boolean;
  speakThreshold: number;
  silenceNudgeSeconds: number;
  nudgeCount: number;
  chatFontSize: number;
  enableVideo: boolean;
  enableAudio: boolean;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  summaryAutoMinutes: number;
  chatPostSummaryMinutes: number;
  chatPostWindowMinutes: number;
  camFontSize: number;
  statsFontSize: number;
  summaryFontSize: number;
  viewersFontSize: number;
  panelLayouts: PanelLayouts;
  hiddenPanels: PanelId[];
  scanlinesEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  twitchClientId: "",
  redirectUri: typeof window !== "undefined" ? window.location.origin + "/" : "",
  videoDeviceId: "",
  audioDeviceId: "",
  autoStartMedia: false,
  speakThreshold: 0.05,
  silenceNudgeSeconds: 60,
  nudgeCount: 0,
  chatFontSize: 14,
  enableVideo: true,
  enableAudio: true,
  llmApiKey: "",
  llmBaseUrl: "https://api.openai.com/v1",
  llmModel: "gpt-4o-mini",
  summaryAutoMinutes: 0,
  chatPostSummaryMinutes: 0,
  chatPostWindowMinutes: 10,
  camFontSize: 12,
  statsFontSize: 14,
  summaryFontSize: 12,
  viewersFontSize: 12,
  panelLayouts: DEFAULT_PANEL_LAYOUTS,
  hiddenPanels: [],
  scanlinesEnabled: true,
};

function currentRedirectUri(): string {
  return typeof window !== "undefined" ? window.location.origin + "/" : "";
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, redirectUri: currentRedirectUri() };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed, redirectUri: currentRedirectUri() };
  } catch {
    return { ...DEFAULT_SETTINGS, redirectUri: currentRedirectUri() };
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function hasRequiredSettings(s: Settings): boolean {
  return !!s.twitchClientId.trim();
}
