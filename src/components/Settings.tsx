import { useRef, useState } from "react";
import { useSettings } from "../settings/useSettings";
import { downloadExport, exportAll, importAll, readJsonFile } from "../settings/exportImport";

interface Props {
  onDone?: () => void;
  embedded?: boolean;
}

export function Settings({ onDone, embedded }: Props) {
  const { settings, update } = useSettings();
  const [clientId, setClientId] = useState(settings.twitchClientId);
  const [llmApiKey, setLlmApiKey] = useState(settings.llmApiKey);
  const [llmBaseUrl, setLlmBaseUrl] = useState(settings.llmBaseUrl);
  const [llmModel, setLlmModel] = useState(settings.llmModel);
  const [backupMsg, setBackupMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    update({
      twitchClientId: clientId.trim(),
      redirectUri: window.location.origin + "/",
      llmApiKey: llmApiKey.trim(),
      llmBaseUrl: llmBaseUrl.trim() || "https://api.openai.com/v1",
      llmModel: llmModel.trim() || "gpt-4o-mini",
    });
    onDone?.();
  }

  function importBundle(bundle: unknown) {
    const wipe = window.confirm(
      "Wipe existing Comrade data before importing?\n\nOK = wipe + import (clean replace)\nCancel = merge (keys in file overwrite, others kept)",
    );
    const res = importAll(bundle, { wipeExisting: wipe });
    if (!res.ok) {
      setBackupMsg({ kind: "err", text: res.error ?? "Import failed" });
      return;
    }
    setBackupMsg({ kind: "ok", text: `Imported ${res.imported} keys. Reloading…` });
    setTimeout(() => window.location.reload(), 600);
  }

  async function copySettingsToClipboard() {
    if (!navigator.clipboard?.writeText) {
      setBackupMsg({ kind: "err", text: "Clipboard copy is not available in this browser." });
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportAll(), null, 2));
      setBackupMsg({ kind: "ok", text: "Copied settings export to clipboard." });
    } catch (err) {
      setBackupMsg({ kind: "err", text: `Copy failed: ${String(err)}` });
    }
  }

  async function pasteSettingsFromClipboard() {
    if (!navigator.clipboard?.readText) {
      setBackupMsg({ kind: "err", text: "Clipboard paste is not available in this browser." });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setBackupMsg({ kind: "err", text: "Clipboard is empty." });
        return;
      }
      importBundle(JSON.parse(text));
    } catch (err) {
      setBackupMsg({ kind: "err", text: `Paste import failed: ${String(err)}` });
    }
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      importBundle(await readJsonFile(file));
    } catch (err) {
      setBackupMsg({ kind: "err", text: String(err) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className={embedded ? "" : "flex h-full items-center justify-center overflow-auto p-6"}>
      <form onSubmit={save} className="panel w-full max-w-xl p-8 space-y-5">
        <div>
          <div className="sw-accent mb-1 text-[10px] text-[var(--sw-cyan)]">// Configuration Grid</div>
          <h1 className="sw-display text-4xl">Settings</h1>
          <p className="mt-2 sw-mono text-xs text-[var(--sw-text-dim)]">
            Stored only in your browser (localStorage). Nothing leaves this device except calls to Twitch.
          </p>
        </div>

        <div className="space-y-2">
          <label className="sw-accent block text-[10px] text-[var(--sw-cyan)]">Twitch Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="abc123…"
            className="sw-input w-full text-sm"
            required
          />
          <p className="sw-mono text-[11px] text-[var(--sw-text-faint)]">
            Create an app at{" "}
            <a
              href="https://dev.twitch.tv/console/apps"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--sw-pink-soft)] underline"
            >
              dev.twitch.tv/console/apps
            </a>
            . OAuth Redirect URL must match below. Category: "Application Integration".
          </p>
        </div>

        <div className="space-y-2">
          <label className="sw-accent block text-[10px] text-[var(--sw-cyan)]">Redirect URI</label>
          <input
            value={window.location.origin + "/"}
            readOnly
            className="sw-input w-full text-sm opacity-70"
          />
          <p className="sw-mono text-[11px] text-[var(--sw-text-faint)]">
            Auto-tracks current origin. Register this exact URL in Twitch dev console.
          </p>
        </div>

        <div className="space-y-3 rounded-sm border border-[rgba(0,240,255,0.30)] bg-[rgba(0,240,255,0.04)] p-3">
          <div>
            <div className="sw-accent text-[11px] text-[var(--sw-cyan)]">▌ LLM (chat summaries)</div>
            <p className="mt-1 sw-mono text-[11px] text-[var(--sw-text-faint)]">
              OpenAI key, or any OpenAI-compatible endpoint. Stored in localStorage only.
            </p>
          </div>
          <div className="space-y-1">
            <label className="sw-accent block text-[10px] text-[var(--sw-text-dim)]">API key</label>
            <input
              type="password"
              autoComplete="off"
              value={llmApiKey}
              onChange={(e) => setLlmApiKey(e.target.value)}
              placeholder="sk-…"
              className="sw-input w-full text-sm"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <label className="sw-accent block text-[10px] text-[var(--sw-text-dim)]">Base URL</label>
              <input
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="sw-input w-full text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="sw-accent block text-[10px] text-[var(--sw-text-dim)]">Model</label>
              <input
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="sw-input w-44 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 rounded-sm border border-[rgba(255,32,121,0.40)] bg-[rgba(255,32,121,0.05)] p-3">
          <div className="sw-accent text-[11px] text-[var(--sw-pink-soft)]">▌ Backup ∙ Layout</div>
          <p className="sw-mono text-[11px] text-[var(--sw-text-faint)]">
            Export/import all Comrade localStorage — including panel layout — settings, token, chat cache.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copySettingsToClipboard} className="btn btn-ghost btn-sm">
              ⎘ Copy
            </button>
            <button type="button" onClick={pasteSettingsFromClipboard} className="btn btn-ghost btn-sm">
              ⎗ Paste
            </button>
            <button type="button" onClick={downloadExport} className="btn btn-cyan btn-sm">
              ↓ Download JSON
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-cyan btn-sm">
              ↑ Import file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={onImportFile}
              className="hidden"
            />
          </div>
          {backupMsg && (
            <div className={`sw-mono text-[11px] ${backupMsg.kind === "ok" ? "text-[var(--sw-success)]" : "text-[var(--sw-danger)]"}`}>
              {backupMsg.text}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {onDone && (
            <button type="button" onClick={onDone} className="btn btn-ghost btn-sm">
              ← Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary ml-auto">
            ✓ Save
          </button>
        </div>
      </form>
    </div>
  );
}
