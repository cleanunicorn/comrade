import { useAuth } from "../auth/AuthContext";
import { ChatProvider } from "../twitch/ChatContext";
import { downloadExport } from "../settings/exportImport";
import { CamPanel } from "./CamPanel";
import { ChatPanel } from "./ChatPanel";
import { StreamStats } from "./StreamStats";
import { ViewerList } from "./ViewerList";

export function Dashboard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <ChatProvider>
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">Comrade</h1>
          <span className="text-neutral-500">/</span>
          <span className="text-neutral-300">{user.display_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <img src={user.profile_image_url} alt="" className="h-8 w-8 rounded-full" />
          <button
            onClick={downloadExport}
            title="Download all settings + chat cache as JSON"
            className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Export
          </button>
          <button
            onClick={onOpenSettings}
            className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Settings
          </button>
          <button
            onClick={logout}
            className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[1fr_220px_1.2fr] lg:grid-rows-1">
        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto">
          <CamPanel />
          <StreamStats />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <ViewerList />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <ChatPanel />
        </div>
      </main>
    </div>
    </ChatProvider>
  );
}
