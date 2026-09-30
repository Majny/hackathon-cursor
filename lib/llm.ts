import { GRANDCHILD_SYSTEM, heuristicFollowUp } from "./brain";
import type { Message } from "./store";

export function llmConfigured(): { provider: "xai" | "openai" | null } {
  if (process.env.XAI_API_KEY?.trim()) return { provider: "xai" };
  if (process.env.OPENAI_API_KEY?.trim()) return { provider: "openai" };
  return { provider: null };
}

export function voiceConfigured(): boolean {
  // Realtime voice needs OpenAI (or a future dedicated voice key). Be honest.
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function generateFollowUp(opts: {
  messages: Message[];
  openThreads: string[];
  priorSummary: string | null;
  userText: string;
}): Promise<{ reply: string; via: "llm" | "heuristic" }> {
  const { provider } = llmConfigured();
  if (!provider) {
    return {
      reply: heuristicFollowUp(opts.userText, opts.openThreads, opts.priorSummary),
      via: "heuristic",
    };
  }

  try {
    const reply = await callChat(provider, opts.messages, opts.priorSummary, opts.openThreads);
    return { reply, via: "llm" };
  } catch {
    return {
      reply: heuristicFollowUp(opts.userText, opts.openThreads, opts.priorSummary),
      via: "heuristic",
    };
  }
}

async function callChat(
  provider: "xai" | "openai",
  messages: Message[],
  priorSummary: string | null,
  openThreads: string[]
): Promise<string> {
  const memory = [
    priorSummary ? `Prior session summary: ${priorSummary}` : null,
    openThreads.length ? `Open threads: ${openThreads.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const system = memory ? `${GRANDCHILD_SYSTEM}\n\n${memory}` : GRANDCHILD_SYSTEM;

  if (provider === "xai") {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-2-latest",
        messages: [
          { role: "system", content: system },
          ...messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.4,
        max_tokens: 120,
      }),
    });
    if (!res.ok) throw new Error(`xAI ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "What happened next?";
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.4,
      max_tokens: 120,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "What happened next?";
}
