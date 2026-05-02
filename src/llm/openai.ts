export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export async function chatCompletion(opts: ChatCompletionOptions): Promise<string> {
  if (!opts.apiKey) throw new Error("LLM API key not set");
  const base = opts.baseUrl.replace(/\/+$/, "");
  const url = `${base}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 2048,
      stream: false,
    }),
    signal: opts.signal,
  });

  const body = (await res.json().catch(() => ({}))) as ChatCompletionResponse;
  if (!res.ok) {
    throw new Error(body.error?.message ?? `LLM ${res.status}`);
  }
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from LLM");
  return text;
}
