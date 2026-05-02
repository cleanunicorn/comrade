import { useRef, useState } from "react";
import { useSettings } from "../settings/SettingsContext";
import { downloadExport, importAll, readJsonFile } from "../settings/exportImport";

interface Props {
  onDone?: () => void;
  embedded?: boolean;
}

export function Settings({ onDone, embedded }: Props) {
  const { settings, update } = useSettings();
  const [clientId, setClientId] = useState(settings.twitchClientId);
  const [redirectUri, setRedirectUri] = useState(settings.redirectUri);
  const [steamAccountId, setSteamAccountId] = useState(settings.steamAccountId);
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    update({
      twitchClientId: clientId.trim(),
      redirectUri: redirectUri.trim(),
      steamAccountId: steamAccountId.trim(),
    });
    onDone?.();
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = await readJsonFile(file);
      const wipe = window.confirm(
        "Wipe existing Comrade data before importing?\n\nOK = wipe + import (clean replace)\nCancel = merge (keys in file overwrite, others kept)",
      );
      const res = importAll(json, { wipeExisting: wipe });
      if (!res.ok) {
        setImportMsg({ kind: "err", text: res.error ?? "Import failed" });
        return;
      }
      setImportMsg({ kind: "ok", text: `Imported ${res.imported} keys. Reloading…` });
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setImportMsg({ kind: "err", text: String(err) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
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

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">Steam Account ID (Deadlock)</label>
          <input
            value={steamAccountId}
            onChange={(e) => setSteamAccountId(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="123456789"
            inputMode="numeric"
            className="w-full rounded bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
          />
          <p className="text-xs text-neutral-500">
            Optional. Enables Deadlock live-match panel. Use the integer Steam ID3 (the
            number, not your username). Find it via{" "}
            <a
              href="https://steamid.io/"
              target="_blank"
              rel="noreferrer"
              className="text-violet-400 underline"
            >
              steamid.io
            </a>
            {" "}— paste your profile URL, copy the value labeled "steamID3" (only the digits).
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
          <div className="text-sm font-medium text-neutral-300">Backup</div>
          <p className="text-xs text-neutral-500">
            Export/import all Comrade localStorage (settings, OAuth token, chat cache).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadExport}
              className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onImportFile}
              className="hidden"
            />
          </div>
          {importMsg && (
            <div className={`text-xs ${importMsg.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
              {importMsg.text}
            </div>
          )}
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
