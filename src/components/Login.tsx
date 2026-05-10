import { useAuth } from "../auth/useAuth";

export function Login({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { login } = useAuth();
  return (
    <div className="relative flex h-full items-center justify-center p-6">
      <div className="panel relative max-w-md p-10 text-center">
        <div className="absolute -top-3 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--sw-cyan)] to-transparent shadow-[0_0_10px_var(--sw-cyan)]" />
        <div className="mb-1 sw-accent text-[10px] text-[var(--sw-cyan)]">// Twitch Streaming Companion</div>
        <h1 className="sw-display sw-flicker mb-3 text-6xl">Comrade</h1>
        <p className="mb-7 sw-mono text-sm text-[var(--sw-text-dim)]">
          Connect your Twitch account to engage the grid.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={login} className="btn btn-primary text-sm">
            ▶ Connect Twitch
          </button>
          <button onClick={onOpenSettings} className="btn btn-ghost btn-sm self-center">
            ⚙ Settings
          </button>
        </div>
        <div className="absolute -bottom-3 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--sw-pink)] to-transparent shadow-[0_0_10px_var(--sw-pink)]" />
      </div>
    </div>
  );
}
