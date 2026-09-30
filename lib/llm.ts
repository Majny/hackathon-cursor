// LLM abstraction (server only). Owned by WP2.
// Order: MOCK_AI=1 -> fixtures; else LLM_PROVIDER (default openai), on error the other provider, then throw.
import { promises as fs } from "fs";
import path from "path";
import { z, type ZodType } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { GoogleGenAI } from "@google/genai";

export type LlmTask = "summary" | "extract" | "chapter";

export interface LlmStructuredOpts<T> {
  task: LlmTask;
  schema: ZodType<T>;
  system: string;
  user: string;
  writer?: boolean;
  /** MOCK_AI only: fixture file to use instead of the task default. */
  mockFixture?: string;
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
  const openai = process.env.OPENAI_MODEL || "gpt-5-mini";
  return {
    openai,
    openaiWriter: process.env.OPENAI_MODEL_WRITER || openai,
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

function providerOrder(): ("openai" | "gemini")[] {
  const all = primaryProvider() === "openai" ? (["openai", "gemini"] as const) : (["gemini", "openai"] as const);
  // Skip providers without a key (keeps error messages short and avoids pointless calls).
  const avail = all.filter((p) => (p === "openai" ? !!process.env.OPENAI_API_KEY : !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)));
  return avail.length ? [...avail] : [...all];
}

// ---------- OpenAI ----------
let openaiClient: OpenAI | null = null;
function openai(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 1 });
  return openaiClient;
}

// Models that reject reasoning_effort are remembered so we do not pay a failed call twice.
const noReasoningEffort = new Set<string>();

function isBadRequest(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  return status === 400;
}

async function withReasoningFallback<R>(model: string, call: (useEffort: boolean) => Promise<R>): Promise<R> {
  if (noReasoningEffort.has(model)) return call(false);
  try {
    return await call(true);
  } catch (e) {
    if (!isBadRequest(e)) throw e;
    const msg = String((e as Error).message || "");
    if (!/reasoning|effort|unsupported|not supported/i.test(msg)) throw e;
    noReasoningEffort.add(model);
    return call(false);
  }
}

async function openaiStructured<T>(opts: LlmStructuredOpts<T>): Promise<{ data: T; model: string }> {
  const models = llmModels();
  const model = opts.writer ? models.openaiWriter : models.openai;
  const attempt = async (): Promise<T | null> => {
    const res = await withReasoningFallback(model, (useEffort) =>
      openai().chat.completions.parse({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response_format: zodResponseFormat(opts.schema as any, opts.task),
        ...(useEffort ? { reasoning_effort: "low" as const } : {}),
      }),
    );
    const msg = res.choices[0]?.message;
    if (!msg || msg.refusal || !msg.parsed) return null;
    return opts.schema.parse(msg.parsed);
  };
  const first = await attempt();
  if (first) return { data: first, model };
  const second = await attempt();
  if (second) return { data: second, model };
  throw new Error("OpenAI returned no parsed output (refusal or empty)");
}

async function openaiText(opts: LlmTextOpts): Promise<string> {
  const model = llmModels().openai;
  const res = await withReasoningFallback(model, (useEffort) =>
    openai().chat.completions.create({
      model,
      messages: [{ role: "system" as const, content: opts.system }, ...opts.messages],
      // reasoning tokens count against the limit, so keep generous headroom
      max_completion_tokens: Math.max(2000, (opts.maxTokens ?? 300) * 8),
      ...(useEffort ? { reasoning_effort: "low" as const } : {}),
    }),
  );
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned empty text");
  return text;
}

// ---------- Gemini ----------
let geminiClient: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (!geminiClient) geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });
  return geminiClient;
}

function jsonSchemaFor(schema: ZodType<unknown>): Record<string, unknown> {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

async function geminiStructured<T>(opts: LlmStructuredOpts<T>): Promise<{ data: T; model: string }> {
  const model = llmModels().gemini;
  const attempt = async (): Promise<T> => {
    const res = await gemini().models.generateContent({
      model,
      contents: opts.user,
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchemaFor(opts.schema as ZodType<unknown>),
      },
    });
    return opts.schema.parse(JSON.parse(res.text ?? ""));
  };
  try {
    return { data: await attempt(), model };
  } catch (e) {
    if ((e as { status?: number })?.status && (e as { status?: number }).status !== 429 && (e as { status?: number }).status! < 500) throw e;
    return { data: await attempt(), model };
  }
}

async function geminiText(opts: LlmTextOpts): Promise<string> {
  const model = llmModels().gemini;
  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  if (contents.length === 0 || contents[0].role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "(start of the conversation)" }] });
  }
  const res = await gemini().models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: Math.max(1024, opts.maxTokens ?? 300),
      ...(/flash/i.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  });
  const text = res.text?.trim();
  if (!text) throw new Error("Gemini returned empty text");
  return text;
}

// ---------- public API ----------
export async function llmStructured<T>(opts: LlmStructuredOpts<T>): Promise<LlmStructuredResult<T>> {
  const t0 = Date.now();
  if (isMockAi()) {
    const fixture = opts.mockFixture ?? (opts.task === "extract" ? "extraction" : opts.task); // data/fixtures/{summary,extraction,chapter}.json
    const data = opts.schema.parse(await readFixture(fixture));
    return { data, provider: "mock", model: "fixture", ms: Date.now() - t0 };
  }
  const errors: string[] = [];
  for (const p of providerOrder()) {
    try {
      const r = p === "openai" ? await openaiStructured(opts) : await geminiStructured(opts);
      return { data: r.data, provider: p, model: r.model, ms: Date.now() - t0 };
    } catch (e) {
      errors.push(`${p}: ${(e as Error).message}`);
      console.error(`[llm] ${opts.task} via ${p} failed:`, (e as Error).message);
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
  const errors: string[] = [];
  for (const p of providerOrder()) {
    try {
      return p === "openai" ? await openaiText(opts) : await geminiText(opts);
    } catch (e) {
      errors.push(`${p}: ${(e as Error).message}`);
      console.error(`[llm] text via ${p} failed:`, (e as Error).message);
    }
  }
  throw new Error(`llmText failed: ${errors.join(" | ")}`);
}
