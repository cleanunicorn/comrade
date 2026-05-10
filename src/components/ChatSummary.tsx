import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useChat } from "../twitch/useChatContext";
import { useStreamInfo } from "../twitch/useStreamInfo";
import { useSettings } from "../settings/useSettings";
import { chatCompletion } from "../llm/openai";
import { FontSizer } from "./FontSizer";
import { PanelFrame } from "./PanelFrame";

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

  const controls = (
    <>
      <FontSizer value={settings.summaryFontSize} onChange={(n) => update({ summaryFontSize: n })} />
      <label className="sw-accent flex items-center gap-1 text-[9px] text-[var(--sw-text-dim)]" title="Panel auto-refresh, 0 = off">
        Auto
        <input
          type="number"
          min={0}
          max={120}
          value={settings.summaryAutoMinutes}
          onChange={(e) =>
            update({ summaryAutoMinutes: Math.max(0, Math.min(120, parseInt(e.target.value || "0", 10))) })
          }
          className="sw-input w-12 text-right text-[10px]"
        />
        m
      </label>
      <label className="sw-accent flex items-center gap-1 text-[9px] text-[var(--sw-text-dim)]" title="Auto-post short summary, 0 = off">
        Post
        <input
          type="number"
          min={0}
          max={120}
          value={settings.chatPostSummaryMinutes}
          onChange={(e) =>
            update({ chatPostSummaryMinutes: Math.max(0, Math.min(120, parseInt(e.target.value || "0", 10))) })
          }
          className="sw-input w-12 text-right text-[10px]"
        />
        m
      </label>
      <label className="sw-accent flex items-center gap-1 text-[9px] text-[var(--sw-text-dim)]" title="Window minutes">
        Win
        <input
          type="number"
          min={1}
          max={120}
          value={settings.chatPostWindowMinutes}
          onChange={(e) =>
            update({ chatPostWindowMinutes: Math.max(1, Math.min(120, parseInt(e.target.value || "1", 10))) })
          }
          className="sw-input w-12 text-right text-[10px]"
        />
        m
      </label>
      {summary && (
        <button type="button" onClick={copy} className="btn btn-ghost btn-sm">Copy</button>
      )}
      <button
        type="button"
        onClick={() => generate({ post: true })}
        disabled={!canRun || !status.connected}
        title={!status.connected ? "Chat not connected" : "Post short summary to Twitch chat"}
        className="btn btn-cyan btn-sm"
      >
        ▶ Post
      </button>
      <button
        type="button"
        onClick={() => generate()}
        disabled={!canRun}
        className="btn btn-primary btn-sm"
      >
        {loading ? "Generating…" : summary ? "↻ Refresh" : "✦ Summarize"}
      </button>
    </>
  );

  return (
    <PanelFrame title="▌ Chat Summary" controls={controls}>
      <div className="mb-2 sw-mono text-[10px] text-[var(--sw-text-faint)]">
        {stream
          ? <>Since stream start · <span className="sw-num text-[var(--sw-cyan)]">{filtered.length}</span> msgs</>
          : <>Offline · <span className="sw-num text-[var(--sw-cyan)]">{filtered.length}</span> cached</>}
        {generatedAt && (
          <span className="ml-2">· gen <span className="sw-num">{Math.floor((now - generatedAt) / 1000)}</span>s ago</span>
        )}
      </div>

      {!settings.llmApiKey && (
        <div className="mb-2 sw-mono text-xs text-[var(--sw-yellow)]">
          ! Add an LLM API key in Settings.
        </div>
      )}

      {error && <div className="mb-2 sw-mono text-xs text-[var(--sw-danger)]">{error}</div>}

      {summary ? (
        <div
          className="markdown-summary max-h-144 overflow-y-auto rounded-sm border border-[rgba(0,240,255,0.25)] bg-[rgba(7,0,15,0.6)] p-3"
          style={{ fontSize: `${settings.summaryFontSize}px` }}
        >
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      ) : (
        <div className="sw-mono text-xs text-[var(--sw-text-faint)]">
          {loading ? "▒▒ Calling LLM ▒▒" : "— No summary yet —"}
        </div>
      )}
    </PanelFrame>
  );
}
