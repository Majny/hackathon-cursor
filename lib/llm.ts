// LLM abstraction. Skeleton by WP0, implementation owned by WP2.
// Order: MOCK_AI=1 -> fixtures; else LLM_PROVIDER (default openai), on error the other provider, then throw.
import { promises as fs } from "fs";
import path from "path";
import type { ZodType } from "zod";

export type LlmTask = "summary" | "extract" | "chapter";

export interface LlmStructuredOpts<T> {
  task: LlmTask;
  schema: ZodType<T>;
  system: string;
  user: string;
  writer?: boolean;
}

export interface LlmStructuredResult<T> {
  data: T;
  provider: string;
  model: string;
  ms: number;
}

export interface LlmTextOpts {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}

export function isMockAi(): boolean {
  return process.env.MOCK_AI === "1";
}

export function llmModels() {
  return {
    openai: process.env.OPENAI_MODEL || "gpt-5-mini",
    openaiWriter: process.env.OPENAI_MODEL_WRITER || "gpt-5",
    gemini: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  };
}

async function readFixture(name: string): Promise<unknown> {
  const p = path.join(process.cwd(), "data", "fixtures", `${name}.json`);
  return JSON.parse(await fs.readFile(p, "utf8"));
}

function primaryProvider(): "openai" | "gemini" {
  return process.env.LLM_PROVIDER === "gemini" ? "gemini" : "openai";
}

// ---------- providers (TODO WP2) ----------
async function openaiStructured<T>(opts: LlmStructuredOpts<T>): Promise<{ data: T; model: string }> {
  // TODO(WP2): see docs/CONTRACTS.md "openai" snippet:
  // client.chat.completions.parse({ model, messages, response_format: zodResponseFormat(schema, task) })
  // -> choices[0].message.parsed; null/refusal -> 1 retry -> throw (fallback to Gemini).
  void opts;
  throw new Error("openaiStructured not implemented (WP2)");
}

async function geminiStructured<T>(opts: LlmStructuredOpts<T>): Promise<{ data: T; model: string }> {
  // TODO(WP2): see docs/CONTRACTS.md "gemini" snippet (config.responseJsonSchema = z.toJSONSchema(schema)).
  void opts;
  throw new Error("geminiStructured not implemented (WP2)");
}

async function openaiText(opts: LlmTextOpts): Promise<string> {
  void opts;
  throw new Error("openaiText not implemented (WP2)");
}

async function geminiText(opts: LlmTextOpts): Promise<string> {
  void opts;
  throw new Error("geminiText not implemented (WP2)");
}

// ---------- public API ----------
export async function llmStructured<T>(opts: LlmStructuredOpts<T>): Promise<LlmStructuredResult<T>> {
  const t0 = Date.now();
  if (isMockAi()) {
    const fixture = opts.task === "extract" ? "extraction" : opts.task; // data/fixtures/{summary,extraction,chapter}.json
    const data = opts.schema.parse(await readFixture(fixture));
    return { data, provider: "mock", model: "fixture", ms: Date.now() - t0 };
  }
  const order = primaryProvider() === "openai" ? (["openai", "gemini"] as const) : (["gemini", "openai"] as const);
  const errors: string[] = [];
  for (const p of order) {
    try {
      const r = p === "openai" ? await openaiStructured(opts) : await geminiStructured(opts);
      return { data: r.data, provider: p, model: r.model, ms: Date.now() - t0 };
    } catch (e) {
      errors.push(`${p}: ${(e as Error).message}`);
    }
  }
  throw new Error(`llmStructured(${opts.task}) failed: ${errors.join(" | ")}`);
}

export async function llmText(opts: LlmTextOpts): Promise<string> {
  if (isMockAi()) {
    const fx = (await readFixture("chat")) as { replies: string[] };
    const n = opts.messages.filter((m) => m.role === "assistant").length;
    return fx.replies[n % fx.replies.length];
  }
  const order = primaryProvider() === "openai" ? (["openai", "gemini"] as const) : (["gemini", "openai"] as const);
  const errors: string[] = [];
  for (const p of order) {
    try {
      return p === "openai" ? await openaiText(opts) : await geminiText(opts);
    } catch (e) {
      errors.push(`${p}: ${(e as Error).message}`);
    }
  }
  throw new Error(`llmText failed: ${errors.join(" | ")}`);
}
