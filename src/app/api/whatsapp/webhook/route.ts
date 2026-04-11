import { NextResponse } from "next/server";
import { parseWhatsappWebhook } from "@/lib/integrations/whatsapp/parse";
import { verifyWhatsAppSignature } from "@/lib/integrations/whatsapp/verify";
import { ingestWhatsappInboundEvent } from "@/lib/integrations/whatsapp/ingest";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}.`);
  return v;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (!mode || !token || !challenge) return new NextResponse("Missing params", { status: 400 });

  let expected: string;
  try {
    expected = requireEnv("WHATSAPP_VERIFY_TOKEN");
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (mode === "subscribe" && token === expected) return new NextResponse(challenge, { status: 200 });
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (process.env.NODE_ENV !== "production") console.log("WhatsApp webhook payload:", rawBody);
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
  if (!verified.ok) return NextResponse.json({ ok: false, reason: verified.reason }, { status: 401 });

  const payload = JSON.parse(rawBody);
  const events = parseWhatsappWebhook(payload);

  for (const e of events) {
    try {
      await ingestWhatsappInboundEvent(e);
    } catch (err) {
      console.error("WhatsApp ingest error:", err);
    }
  }

  return NextResponse.json({ ok: true, received: events.length });
}
