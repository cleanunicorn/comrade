import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useChat } from "../twitch/ChatContext";
import { useStreamInfo } from "../twitch/useStreamInfo";
import { useSettings } from "../settings/SettingsContext";
import { chatCompletion } from "../llm/openai";

const MAX_MESSAGES = 400;
const MAX_CHARS = 12_000;

export function ChatSummary() {
  const { messages } = useChat();
  const { stream } = useStreamInfo();
  const { settings, update } = useSettings();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);

  const cutoffTs = stream ? new Date(stream.started_at).getTime() : 0;
  const filtered = useMemo(() => {
    const arr = cutoffTs ? messages.filter((m) => m.ts >= cutoffTs) : messages;
    return arr.slice(-MAX_MESSAGES);
  }, [messages, cutoffTs]);

  const transcript = useMemo(() => {
    const lines = filtered.map((m) => `${m.displayName}: ${m.text}`);
    let body = lines.join("\n");
    if (body.length > MAX_CHARS) body = body.slice(-MAX_CHARS);
    return body;
  }, [filtered]);

  const canRun = !!settings.llmApiKey && filtered.length > 0 && !loading;

  const inFlightRef = useRef(false);
  const generate = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (inFlightRef.current) return;
      if (!settings.llmApiKey) {
        if (!opts.silent) setError("Set an LLM API key in Settings first.");
        return;
      }
      if (filtered.length === 0) {
        if (!opts.silent) setError("No chat messages to summarize yet.");
        return;
      }
      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const game = stream?.game_name ? `Game: ${stream.game_name}\n` : "";
        const title = stream?.title ? `Title: ${stream.title}\n` : "";
        const sysPrompt =
          "You summarize live Twitch chat for the streamer. Be concise. Format the response in Markdown " +
          "with short sections (use ## headings): Mood,  Notable questions, Main topics, Standout viewers. " +
          "Use bullet lists. Skip greetings and bot spam. Surface direct questions to the streamer.";
        const userPrompt = `${title}${game}\n--- Chat transcript (oldest → newest, since stream start) ---\n${transcript}`;
        const text = await chatCompletion({
          apiKey: settings.llmApiKey,
          baseUrl: settings.llmBaseUrl,
          model: settings.llmModel,
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          maxTokens: 2048,
        });
        setSummary(text);
        setGeneratedAt(Date.now());
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [settings.llmApiKey, settings.llmBaseUrl, settings.llmModel, filtered.length, transcript, stream?.game_name, stream?.title],
  );

  useEffect(() => {
    const minutes = settings.summaryAutoMinutes;
    if (minutes <= 0) return;
    if (!settings.llmApiKey) return;
    const id = window.setInterval(() => {
      generate({ silent: true });
    }, minutes * 60_000);
    return () => window.clearInterval(id);
  }, [settings.summaryAutoMinutes, settings.llmApiKey, generate]);

  function copy() {
    if (!summary) return;
    navigator.clipboard.writeText(summary).catch(() => {});
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Chat summary
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-neutral-400">
            Auto every
            <input
              type="number"
              min={0}
              max={120}
              value={settings.summaryAutoMinutes}
              onChange={(e) =>
                update({
                  summaryAutoMinutes: Math.max(0, Math.min(120, parseInt(e.target.value || "0", 10))),
                })
              }
              title="0 = off"
              className="w-12 rounded bg-neutral-800 px-1.5 py-0.5 text-right text-[10px] text-neutral-200 outline-none focus:ring-2 focus:ring-violet-500"
            />
            min
          </label>
          {summary && (
            <button
              type="button"
              onClick={copy}
              className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-800"
            >
              Copy
            </button>
          )}
          <button
            type="button"
            onClick={() => generate()}
            disabled={!canRun}
            className="rounded bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? "Summarizing…" : summary ? "Refresh" : "Summarize"}
          </button>
        </div>
      </div>

      <div className="mb-2 text-[10px] text-neutral-500">
        {stream
          ? `Since stream start · ${filtered.length} messages`
          : `Stream offline · using all ${filtered.length} cached messages`}
        {generatedAt && (
          <span className="ml-2">
            · generated {Math.floor((Date.now() - generatedAt) / 1000)}s ago
          </span>
        )}
      </div>

      {!settings.llmApiKey && (
        <div className="mb-2 text-xs text-amber-400">
          Add an LLM API key in Settings to enable.
        </div>
      )}

      {error && <div className="mb-2 text-xs text-red-400">{error}</div>}

      {summary ? (
        <div className="markdown-summary max-h-72 overflow-y-auto rounded bg-neutral-900/60 p-3 text-xs text-neutral-200">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      ) : (
        <div className="text-xs text-neutral-500">
          {loading ? "Calling LLM…" : "No summary yet."}
        </div>
      )}
    </div>
  );
}
