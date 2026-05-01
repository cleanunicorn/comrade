import { useState } from "react";
import { useSettings } from "../settings/SettingsContext";

interface Props {
  onDone?: () => void;
  embedded?: boolean;
}

export function Settings({ onDone, embedded }: Props) {
  const { settings, update } = useSettings();
  const [clientId, setClientId] = useState(settings.twitchClientId);
  const [redirectUri, setRedirectUri] = useState(settings.redirectUri);

  function save(e: React.FormEvent) {
    e.preventDefault();
    update({ twitchClientId: clientId.trim(), redirectUri: redirectUri.trim() });
    onDone?.();
  }

  return (
    <div className={embedded ? "" : "flex h-full items-center justify-center p-6"}>
      <form
        onSubmit={save}
        className="w-full max-w-xl space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 shadow-xl"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Stored only in your browser (localStorage). Nothing leaves this device except
            calls to Twitch.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">Twitch Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="abc123…"
            className="w-full rounded bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            required
          />
          <p className="text-xs text-neutral-500">
            Create an app at{" "}
            <a
              href="https://dev.twitch.tv/console/apps"
              target="_blank"
              rel="noreferrer"
              className="text-violet-400 underline"
            >
              dev.twitch.tv/console/apps
            </a>
            . OAuth Redirect URL must match the field below. Category: "Application Integration".
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">Redirect URI</label>
          <input
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            className="w-full rounded bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            required
          />
          <p className="text-xs text-neutral-500">
            Default: <code className="text-neutral-400">{window.location.origin}/</code>
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="text-sm text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="ml-auto rounded-lg bg-violet-600 px-5 py-2 font-semibold text-white hover:bg-violet-500"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
