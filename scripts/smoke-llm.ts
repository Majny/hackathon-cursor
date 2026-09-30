// STUB by WP0 – WP2 implements (real keys: all 3 schemas on OpenAI and LLM_PROVIDER=gemini, print timings).
import { llmStructured } from "../lib/llm";
import { SessionSummarySchema, ExtractionSchema, ChapterSchema } from "../lib/schemas";

async function main() {
  for (const [task, schema] of [
    ["summary", SessionSummarySchema],
    ["extract", ExtractionSchema],
    ["chapter", ChapterSchema],
  ] as const) {
    const r = await llmStructured({ task, schema: schema as never, system: "", user: "" });
    console.log(task, r.provider, r.model, `${r.ms} ms`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
