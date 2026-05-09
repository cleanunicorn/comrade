import { useAuth } from "../auth/useAuth";

export function Login({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { login } = useAuth();
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 text-center shadow-xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight">Comrade</h1>
        <p className="mb-6 text-neutral-400">
          Your Twitch streaming companion. Connect your Twitch account to get started.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={login}
            className="rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
          >
            Connect Twitch
          </button>
          <button
            onClick={onOpenSettings}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
