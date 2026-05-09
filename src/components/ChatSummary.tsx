import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useChat } from "../twitch/useChatContext";
import { useStreamInfo } from "../twitch/useStreamInfo";
import { useSettings } from "../settings/useSettings";
import { chatCompletion } from "../llm/openai";
import { FontSizer } from "./FontSizer";

const MAX_MESSAGES = 400;
const MAX_CHARS = 12_000;
const SUMMARY_PREFIX = "🤖 ";
const POST_MAX_CHARS = 450;

export function ChatSummary() {
  const { messages, send, status } = useChat();
  const { stream } = useStreamInfo();
  const { settings, update } = useSettings();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const cutoffTs = stream ? new Date(stream.started_at).getTime() : 0;
  const filtered = useMemo(() => {
    const arr = (cutoffTs ? messages.filter((m) => m.ts >= cutoffTs) : messages).filter(
      (m) => !m.text.startsWith(SUMMARY_PREFIX),
    );
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
  const lastPostedAtRef = useRef(0);
  const generate = useCallback(
    async (opts: { silent?: boolean; post?: boolean } = {}) => {
      if (inFlightRef.current) return;
      if (!settings.llmApiKey) {
        if (!opts.silent) setError("Set an LLM API key in Settings first.");
        return;
      }
      if (filtered.length === 0) {
        if (!opts.silent) setError("No chat messages to summarize yet.");
        return;
      }
      let postSubset = filtered;
      if (opts.post) {
        const windowMs = Math.max(1, settings.chatPostWindowMinutes) * 60_000;
        const cutoff = Date.now() - windowMs;
        postSubset = filtered.filter((m) => m.ts >= cutoff && m.ts > lastPostedAtRef.current);
        if (postSubset.length === 0) {
          if (!opts.silent) setError("No new chat messages in the window.");
          return;
        }
        if (!status.connected) {
          if (!opts.silent) setError("Chat not connected.");
          return;
        }
      }
      inFlightRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const game = stream?.game_name ? `Game: ${stream.game_name}\n` : "";
        const title = stream?.title ? `Title: ${stream.title}\n` : "";
        const sysPrompt = opts.post
          ? "Write ONE short sentence (≤350 chars, no markdown, no list) summarizing the recent Twitch chat for the chat itself. Tone skarky, sarcastic, my chat can take it. Use a little bit of leet speak, make grammar mistakes."
          : "You summarize live Twitch chat for the streamer. Be concise. Format the response in Markdown " +
            "with short sections (use ## headings): Mood, Notable questions, Main topics, Standout viewers. " +
            "Use bullet lists. Skip greetings and bot spam. Surface direct questions to the streamer.";
        const transcriptForPrompt = (() => {
          if (!opts.post) return transcript;
          const lines = postSubset.map((m) => `${m.displayName}: ${m.text}`);
          let body = lines.join("\n");
          if (body.length > MAX_CHARS) body = body.slice(-MAX_CHARS);
          return body;
        })();
        const scope = opts.post
          ? `last ${settings.chatPostWindowMinutes} min`
          : "since stream start";
        const userPrompt = `${title}${game}\n--- Chat transcript (oldest → newest, ${scope}) ---\n${transcriptForPrompt}`;
        const text = await chatCompletion({
          apiKey: settings.llmApiKey,
          baseUrl: settings.llmBaseUrl,
          model: settings.llmModel,
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 1.4,
          maxTokens: 16000,
        });
        if (opts.post) {
          const trimmed = text.replace(/\s+/g, " ").trim().slice(0, POST_MAX_CHARS);
          send(SUMMARY_PREFIX + trimmed);
          lastPostedAtRef.current = postSubset[postSubset.length - 1]?.ts ?? Date.now();
        } else {
          setSummary(text);
          setGeneratedAt(Date.now());
        }
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [
      settings.llmApiKey,
      settings.llmBaseUrl,
      settings.llmModel,
      settings.chatPostWindowMinutes,
      filtered,
      transcript,
      stream,
      send,
      status.connected,
    ],
  );

  const generateRef = useRef(generate);
  useEffect(() => {
    generateRef.current = generate;
  }, [generate]);

  useEffect(() => {
    const minutes = settings.summaryAutoMinutes;
    if (minutes <= 0) return;
    if (!settings.llmApiKey) return;
    const id = window.setInterval(() => {
      generateRef.current({ silent: true });
    }, minutes * 60_000);
    return () => window.clearInterval(id);
  }, [settings.summaryAutoMinutes, settings.llmApiKey]);

  useEffect(() => {
    const minutes = settings.chatPostSummaryMinutes;
    if (minutes <= 0) return;
    if (!settings.llmApiKey) return;
    const id = window.setInterval(() => {
      generateRef.current({ silent: true, post: true });
    }, minutes * 60_000);
    return () => window.clearInterval(id);
  }, [settings.chatPostSummaryMinutes, settings.llmApiKey]);

  function copy() {
    if (!summary) return;
    navigator.clipboard.writeText(summary).catch(() => {});
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Chat summary
          </h2>
          <FontSizer
            value={settings.summaryFontSize}
            onChange={(n) => update({ summaryFontSize: n })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-neutral-400" title="Panel auto-refresh, 0 = off">
            Auto
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
              className="w-12 rounded bg-neutral-800 px-1.5 py-0.5 text-right text-[10px] text-neutral-200 outline-none focus:ring-2 focus:ring-violet-500"
            />
            m
          </label>
          <label className="flex items-center gap-1 text-[10px] text-neutral-400" title="Auto-post short summary into Twitch chat, 0 = off">
            Post every
            <input
              type="number"
              min={0}
              max={120}
              value={settings.chatPostSummaryMinutes}
              onChange={(e) =>
                update({
                  chatPostSummaryMinutes: Math.max(0, Math.min(120, parseInt(e.target.value || "0", 10))),
                })
              }
              className="w-12 rounded bg-neutral-800 px-1.5 py-0.5 text-right text-[10px] text-neutral-200 outline-none focus:ring-2 focus:ring-violet-500"
            />
            m
          </label>
          <label className="flex items-center gap-1 text-[10px] text-neutral-400" title="Post mode summarizes only messages from the last N minutes">
            window
            <input
              type="number"
              min={1}
              max={120}
              value={settings.chatPostWindowMinutes}
              onChange={(e) =>
                update({
                  chatPostWindowMinutes: Math.max(1, Math.min(120, parseInt(e.target.value || "1", 10))),
                })
              }
              className="w-12 rounded bg-neutral-800 px-1.5 py-0.5 text-right text-[10px] text-neutral-200 outline-none focus:ring-2 focus:ring-violet-500"
            />
            m
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
            onClick={() => generate({ post: true })}
            disabled={!canRun || !status.connected}
            title={!status.connected ? "Chat not connected" : "Post short summary to Twitch chat"}
            className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            Post
          </button>
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
            · generated {Math.floor((now - generatedAt) / 1000)}s ago
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
        <div
          className="markdown-summary max-h-144 overflow-y-auto rounded bg-neutral-900/60 p-3 text-neutral-200"
          style={{ fontSize: `${settings.summaryFontSize}px` }}
        >
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
