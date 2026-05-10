import { useMemo } from "react";
import {
  Responsive,
  WidthProvider,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts,
} from "react-grid-layout/legacy";
import { useAuth } from "../auth/useAuth";
import { ChatProvider } from "../twitch/ChatContext";
import { useSettings } from "../settings/useSettings";
import {
  DEFAULT_PANEL_LAYOUTS,
  PANEL_IDS,
  type PanelId,
  type PanelLayouts,
} from "../settings/store";
import { CamPanel } from "./CamPanel";
import { ChatPanel } from "./ChatPanel";
import { ChatSummary } from "./ChatSummary";
import { StreamStats } from "./StreamStats";
import { ViewerList } from "./ViewerList";

const ResponsiveGrid = WidthProvider(Responsive);

const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1280, md: 992, sm: 720, xs: 480, xxs: 0 };

function renderPanel(id: PanelId) {
  switch (id) {
    case "cam": return <CamPanel />;
    case "stats": return <StreamStats />;
    case "summary": return <ChatSummary />;
    case "viewers": return <ViewerList />;
    case "chat": return <ChatPanel />;
  }
}

function fillLayouts(saved: PanelLayouts | undefined, hidden: PanelId[]): ResponsiveLayouts {
  const out: ResponsiveLayouts = {};
  for (const bp of Object.keys(DEFAULT_PANEL_LAYOUTS)) {
    const def = DEFAULT_PANEL_LAYOUTS[bp];
    const userBp = saved?.[bp] ?? [];
    const merged: LayoutItem[] = [];
    let nextY = def.reduce((m, d) => Math.max(m, d.y + d.h), 0);
    for (const id of PANEL_IDS) {
      if (hidden.includes(id)) continue;
      const u = userBp.find((x) => x.i === id);
      const d = def.find((x) => x.i === id);
      if (u) {
        merged.push({ ...u });
      } else if (d) {
        merged.push({ ...d, y: nextY });
        nextY += d.h;
      }
    }
    out[bp] = merged;
  }
  return out;
}

export function Dashboard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { user, logout } = useAuth();
  const { settings, update } = useSettings();
  const hidden = useMemo(() => settings.hiddenPanels ?? [], [settings.hiddenPanels]);

  const layouts = useMemo<ResponsiveLayouts>(
    () => fillLayouts(settings.panelLayouts, hidden),
    [settings.panelLayouts, hidden],
  );

  if (!user) return null;

  function onLayoutChange(_current: Layout, all: ResponsiveLayouts) {
    const cleaned: PanelLayouts = {};
    for (const [bp, items] of Object.entries(all)) {
      if (!items) continue;
      cleaned[bp] = items.map((it) => ({
        i: it.i,
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
        minW: it.minW,
        minH: it.minH,
      }));
    }
    update({ panelLayouts: cleaned });
  }

  function resetLayout() {
    if (!window.confirm("Reset panel layout to defaults?")) return;
    update({ panelLayouts: DEFAULT_PANEL_LAYOUTS, hiddenPanels: [] });
  }

  function togglePanel(id: PanelId) {
    const next = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
    update({ hiddenPanels: next });
  }

  const visibleIds = PANEL_IDS.filter((id) => !hidden.includes(id));

  return (
    <ChatProvider>
      <div className="flex h-full flex-col">
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(255,32,121,0.45)] bg-[linear-gradient(90deg,rgba(255,32,121,0.18),rgba(0,240,255,0.10)_60%,rgba(255,229,59,0.10))] px-5 py-3 shadow-[0_0_24px_rgba(255,32,121,0.35)]">
          <div className="flex items-center gap-3">
            <h1 className="sw-display sw-flicker text-3xl leading-none">Comrade</h1>
            <span className="sw-accent text-[10px] text-[var(--sw-pink-soft)]">// {user.display_name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 hidden items-center gap-1 sm:flex">
              <span className="sw-accent text-[9px] text-[var(--sw-text-dim)]">PANELS</span>
              {PANEL_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePanel(id)}
                  className={`sw-chip ${hidden.includes(id) ? "" : "is-active"}`}
                  title={hidden.includes(id) ? `Show ${id}` : `Hide ${id}`}
                >
                  {id}
                </button>
              ))}
            </div>
            <button onClick={resetLayout} className="btn btn-ghost btn-sm" title="Reset panel layout">
              ↺ Reset
            </button>
            <img
              src={user.profile_image_url}
              alt=""
              className="h-8 w-8 rounded-full border border-[var(--sw-cyan)] shadow-[0_0_8px_var(--sw-cyan)]"
            />
            <button onClick={onOpenSettings} className="btn btn-cyan btn-sm">Settings</button>
            <button onClick={logout} className="btn btn-ghost btn-sm">Logout</button>
          </div>
        </header>

        <main className="relative z-0 min-h-0 flex-1 overflow-auto p-3">
          {visibleIds.length === 0 ? (
            <div className="flex h-full items-center justify-center sw-accent text-[var(--sw-text-dim)]">
              All panels hidden — toggle one above.
            </div>
          ) : (
            <ResponsiveGrid
              className="layout"
              layouts={layouts}
              breakpoints={BREAKPOINTS}
              cols={COLS}
              rowHeight={26}
              margin={[12, 12]}
              containerPadding={[0, 0]}
              draggableHandle=".panel-handle"
              draggableCancel="input,select,textarea,button,a,label,.no-drag"
              compactType="vertical"
              onLayoutChange={onLayoutChange}
            >
              {visibleIds.map((id) => (
                <div key={id} data-panel-id={id}>
                  {renderPanel(id)}
                </div>
              ))}
            </ResponsiveGrid>
          )}
        </main>
      </div>
    </ChatProvider>
  );
}
