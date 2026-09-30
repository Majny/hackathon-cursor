// Wires the phone channel: Twilio number -> ElevenLabs agent "Tom" -> our webhooks.
// Run (orchestrator/human):
//   npx tsx --env-file=.env.local --env-file=.env.production.local scripts/setup-phone.ts
// Needs: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, and either ELEVENLABS_PHONE_NUMBER_ID or
//        TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER. PUBLIC_BASE_URL for webhooks.
// Idempotent-ish: re-running re-assigns the agent and re-points the webhooks.
// Optional: ELEVENLABS_INIT_SECRET (generated + printed if missing).
// Flags: --new-webhook  create a fresh post-call webhook even if ELEVENLABS_POST_CALL_WEBHOOK_ID is set.
//
// Endpoints (REST snake_case of @elevenlabs/elevenlabs-js 2.70 types):
//   POST  /v1/convai/phone-numbers            {provider:"twilio", phone_number, label, sid, token, agent_id} -> {phone_number_id}
//   PATCH /v1/convai/phone-numbers/{id}       {agent_id}
//   POST  /v1/workspace/webhooks              {settings:{auth_type:"hmac", name, webhook_url}} -> {webhook_id, webhook_secret}
//   PATCH /v1/convai/agents/{agent_id}        {platform_settings:{overrides:{enable_conversation_initiation_client_data_from_webhook},
//                                              workspace_overrides:{conversation_initiation_client_data_webhook:{url, request_headers},
//                                                                   webhooks:{post_call_webhook_id, events, transcript_format}}}}
//   PATCH /v1/convai/settings                 (workspace-level fallback, same webhook fields)

import { randomBytes } from "node:crypto";

const API = "https://api.elevenlabs.io";
const env = process.env;
const apiKey = env.ELEVENLABS_API_KEY ?? "";
const agentId = env.ELEVENLABS_AGENT_ID ?? "";
const baseUrl = (env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
const newWebhook = process.argv.includes("--new-webhook");
// Shared secret ElevenLabs sends to /api/phone/init as `x-heirloom-secret` (route rejects mismatches when set).
const initSecret = env.ELEVENLABS_INIT_SECRET || randomBytes(24).toString("hex");
const initSecretIsNew = !env.ELEVENLABS_INIT_SECRET;

const printed: string[] = [];
const out = (k: string, v: string) => { printed.push(`${k}=${v}`); console.log(`  ${k}=${v}`); };

async function el<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T; text: string }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = {} as T;
  try { data = JSON.parse(text) as T; } catch { /* keep text */ }
  return { ok: res.ok, status: res.status, data, text };
}

async function main() {
  if (!apiKey || !agentId) {
    console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID (run scripts/create-agent.ts first).");
    process.exit(1);
  }

  // 1) Import the Twilio number
  let phoneNumberId = env.ELEVENLABS_PHONE_NUMBER_ID ?? "";
  if (!phoneNumberId) {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_PHONE_NUMBER: number } = env;
    if (!sid || !token || !number) {
      console.error("Set ELEVENLABS_PHONE_NUMBER_ID, or TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER to import one.");
      process.exit(1);
    }
    console.log(`1) Importing Twilio number ${number} into ElevenLabs…`);
    const r = await el<{ phone_number_id?: string }>("POST", "/v1/convai/phone-numbers", {
      provider: "twilio", phone_number: number, label: "Heirloom – Tom", sid, token, agent_id: agentId,
    });
    if (!r.ok || !r.data.phone_number_id) {
      console.error(`   Import failed (${r.status}): ${r.text}`);
      console.error("   Manual: ElevenLabs dashboard → Agents → Phone Numbers → Import number → Twilio (paste SID + Auth Token), then copy its ID.");
      process.exit(1);
    }
    phoneNumberId = r.data.phone_number_id;
    console.log("   Imported. Add to your env:");
    out("ELEVENLABS_PHONE_NUMBER_ID", phoneNumberId);
  } else {
    console.log(`1) Using existing ELEVENLABS_PHONE_NUMBER_ID=${phoneNumberId}`);
  }

  // 2) Assign agent
  console.log("2) Assigning agent to the phone number…");
  const a = await el("PATCH", `/v1/convai/phone-numbers/${encodeURIComponent(phoneNumberId)}`, { agent_id: agentId });
  console.log(a.ok ? "   OK" : `   Failed (${a.status}): ${a.text}\n   Manual: Phone Numbers → your number → Agent = Tom.`);

  if (!baseUrl) {
    console.log("\nPUBLIC_BASE_URL not set – skipping webhooks. Outbound calls work, but memory for INBOUND calls and transcript sync need it.");
    return summary();
  }
  const initUrl = `${baseUrl}/api/phone/init`;
  const postCallUrl = `${baseUrl}/api/phone/post-call`;

  // 3) Post-call webhook (workspace webhook, HMAC)
  let webhookId = env.ELEVENLABS_POST_CALL_WEBHOOK_ID ?? "";
  if (!webhookId || newWebhook) {
    console.log(`3) Creating post-call webhook → ${postCallUrl}`);
    const w = await el<{ webhook_id?: string; webhook_secret?: string }>("POST", "/v1/workspace/webhooks", {
      settings: { auth_type: "hmac", name: `Heirloom post-call ${new Date().toISOString().slice(0, 16)}`, webhook_url: postCallUrl },
    });
    if (w.ok && w.data.webhook_id) {
      webhookId = w.data.webhook_id;
      console.log("   Created. Add to your env (Vercel too!):");
      out("ELEVENLABS_POST_CALL_WEBHOOK_ID", webhookId);
      if (w.data.webhook_secret) out("ELEVENLABS_WEBHOOK_SECRET", w.data.webhook_secret);
    } else {
      console.log(`   Failed (${w.status}): ${w.text}`);
    }
  } else {
    console.log(`3) Using existing ELEVENLABS_POST_CALL_WEBHOOK_ID=${webhookId}`);
  }

  // 4) Agent platform settings: allow init webhook + point webhooks to us
  console.log("4) Configuring agent platform settings…");
  const initHeaders = { "x-heirloom-secret": initSecret };
  if (initSecretIsNew) {
    console.log("   Generated init-webhook secret. Add to your env (Vercel too!):");
    out("ELEVENLABS_INIT_SECRET", initSecret);
  }
  const webhooks = webhookId ? { post_call_webhook_id: webhookId, events: ["transcript", "call_initiation_failure"], transcript_format: "json" } : undefined;
  const p = await el("PATCH", `/v1/convai/agents/${encodeURIComponent(agentId)}`, {
    platform_settings: {
      overrides: { enable_conversation_initiation_client_data_from_webhook: true },
      workspace_overrides: {
        conversation_initiation_client_data_webhook: { url: initUrl, request_headers: initHeaders },
        ...(webhooks ? { webhooks } : {}),
      },
    },
  });
  if (p.ok) {
    console.log("   OK (agent-level overrides)");
  } else {
    console.log(`   Agent PATCH failed (${p.status}): ${p.text.slice(0, 400)}\n   Trying workspace-level settings…`);
    const s = await el("PATCH", "/v1/convai/settings", {
      conversation_initiation_client_data_webhook: { url: initUrl, request_headers: initHeaders },
      ...(webhooks ? { webhooks } : {}),
    });
    console.log(s.ok ? "   OK (workspace-level)" : `   Failed (${s.status}): ${s.text.slice(0, 400)}`);
    if (!s.ok) manualSteps(initUrl, postCallUrl);
  }
  if (!webhookId) manualSteps(initUrl, postCallUrl);
  return summary();
}

function manualSteps(initUrl: string, postCallUrl: string) {
  console.log(`
MANUAL STEPS (ElevenLabs dashboard):
  a) Agents → Settings (workspace) → Webhooks → "Post-call webhook" → Create webhook
       URL: ${postCallUrl}   Auth: HMAC   → copy the secret into ELEVENLABS_WEBHOOK_SECRET
     Events: Transcript + Call initiation failure.
  b) Same page → "Conversation initiation client data webhook" → URL: ${initUrl}
       Header: x-heirloom-secret = <ELEVENLABS_INIT_SECRET>
  c) Agent "Tom" → Security → enable "Fetch conversation initiation data for inbound Twilio calls".
`);
}

function summary() {
  console.log(`\nDone. Test: POST ${baseUrl || "http://localhost:3456"}/api/phone/call  (always dials GRANDPA_PHONE_NUMBER)`);
  if (printed.length) console.log(`\nNew env values:\n${printed.join("\n")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
