import { parseWhatsappWebhook } from "@/lib/integrations/whatsapp/parse";
import { verifyWhatsAppSignature } from "@/lib/integrations/whatsapp/verify";
import { ingestWhatsappInboundEvent } from "@/lib/integrations/whatsapp/ingest";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}.`);
  return v;
}

async function handleWhatsappWebhook(payload: unknown) {
  const events = parseWhatsappWebhook(payload);

  for (const e of events) {
    try {
      await ingestWhatsappInboundEvent(e);
    } catch (err) {
      console.error("WhatsApp ingest error:", err);
    }
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    let expected: string;
    try {
      expected = requireEnv("WHATSAPP_VERIFY_TOKEN");
    } catch {
      return new Response("Forbidden", { status: 403 });
    }

    if (mode === "subscribe" && token === expected && typeof challenge === "string" && challenge.length > 0) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const payload = (() => {
      try {
        return JSON.parse(rawBody) as unknown;
      } catch {
        return null;
      }
    })();
    const sig = req.headers.get("x-hub-signature-256");
    const appSecret = process.env.WHATSAPP_APP_SECRET || null;

    const verified = verifyWhatsAppSignature({ rawBody, signatureHeader: sig, appSecret });
    if (!verified.ok && process.env.NODE_ENV !== "production") {
      console.warn("WhatsApp signature rejected:", {
        reason: verified.reason,
        hasSecret: Boolean(appSecret && appSecret.trim().length > 0),
        hasSignature: Boolean(sig),
        signaturePrefix: sig ? sig.slice(0, 24) : null,
      });
    }
    if (!verified.ok) return new Response("Unauthorized", { status: 401 });

    if (payload) {
      handleWhatsappWebhook(payload).catch((err) => console.error("WhatsApp webhook handler error:", err));
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("WhatsApp webhook POST error:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}
