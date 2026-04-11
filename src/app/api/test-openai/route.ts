import { NextResponse } from "next/server";
import { parseTextWithOpenAI } from "@/lib/ai/text-parser";
import { estimateOpenAiCostCents } from "@/lib/openai-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getUsage(raw: unknown): { parser: string | null; model: string | null; inputTokens: number; outputTokens: number } {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const parser = typeof obj?.parser === "string" ? obj.parser : null;
  const model = typeof obj?.model === "string" ? obj.model : null;
  const usage = obj?.usage && typeof obj.usage === "object" ? (obj.usage as Record<string, unknown>) : null;
  const inputTokens = typeof usage?.inputTokens === "number" ? usage.inputTokens : 0;
  const outputTokens = typeof usage?.outputTokens === "number" ? usage.outputTokens : 0;
  return { parser, model, inputTokens, outputTokens };
}

export async function GET() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 400 });
  }

  const text = "Recebi um pix de 150 reais";
  const extraction = await parseTextWithOpenAI(text);
  const usage = getUsage(extraction.raw);
  const cost =
    usage.model && (usage.inputTokens > 0 || usage.outputTokens > 0)
      ? estimateOpenAiCostCents({ model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens })
      : { ok: false as const, costCents: 0 };

  const usedOpenAi = usage.parser === "openai";

  let openAiProbe: { status: number; body: string } | null = null;
  if (!usedOpenAi) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini",
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const body = await res.text().catch(() => "");
      openAiProbe = { status: res.status, body: body.slice(0, 1200) };
    } catch (err) {
      openAiProbe = { status: 0, body: err instanceof Error ? err.message : "probe_error" };
    }
  }

  return NextResponse.json(
    {
      ok: usedOpenAi,
      text,
      extraction,
      usage: { model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
      cost: { ok: cost.ok, costCents: cost.costCents },
      openAiProbe,
    },
    { status: usedOpenAi ? 200 : 502 }
  );
}
