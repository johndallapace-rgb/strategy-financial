"use server";

import { formatBRL } from "@/lib/money";

export type TextExtraction = {
  name: string | null;
  amount: number | null;
  type: "income" | "expense" | null;
  notes?: string | null;
  confidence: "low" | "medium" | "high";
  raw: Record<string, unknown>;
};

function heuristicParse(text: string): TextExtraction {
  const normalized = text.trim();
  const amountMatch = normalized.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d{2})?)/);
  const amount =
    amountMatch?.[1] != null
      ? Number(amountMatch[1].replace(/\./g, "").replace(",", "."))
      : null;

  const lowered = normalized.toLowerCase();
  const type = /(recebi|recebimento|entrada|pix recebido|pagamento recebido)/.test(lowered)
    ? ("income" as const)
    : /(paguei|pagar|gastei|compra|uber|almoço|jantar|mercado|saque)/.test(lowered)
      ? ("expense" as const)
      : null;

  const name = normalized.length > 0 ? normalized.slice(0, 80) : null;

  return {
    name,
    amount: Number.isFinite(amount as number) ? amount : null,
    type,
    confidence: amount || type ? "medium" : "low",
    raw: { parser: "heuristic", preview: normalized.slice(0, 220) },
  };
}

export async function parseTextWithOpenAI(text: string): Promise<TextExtraction> {
  const apiKey = process.env.OPENAI_API_KEY || null;
  const model = process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini";
  if (!apiKey) return heuristicParse(text);

  const debug = process.env.OPENAI_DEBUG === "1";

  const system =
    "Você é um assistente que extrai dados estruturados de mensagens curtas em pt-BR sobre finanças pessoais/empresariais. " +
    "Retorne somente JSON válido seguindo o schema exato.";

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: ["string", "null"] },
      amount: { type: ["number", "null"] },
      type: { type: ["string", "null"], enum: ["income", "expense", null] },
      notes: { type: ["string", "null"] },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
    },
    required: ["name", "amount", "type", "notes", "confidence"],
  } as const;

  const user =
    "Mensagem:\n" +
    text +
    "\n\nDica: valores em BRL podem aparecer como " +
    formatBRL(19.9) +
    " ou 19,90. Extraia apenas o essencial.";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "TextExtraction",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "unknown error");
    console.error("OpenAI Error:", res.status, body);
    return heuristicParse(text);
  }
  const json = await res.json().catch(() => null);
  const outputText = json?.choices?.[0]?.message?.content;
  if (typeof outputText !== "string") return heuristicParse(text);
  
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (err) {
    console.error("OpenAI JSON Parse Error:", err);
    return heuristicParse(text);
  }
  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  const usageObj = json?.usage && typeof json.usage === "object" ? (json.usage as Record<string, unknown>) : null;
  const inputTokens = typeof usageObj?.prompt_tokens === "number" ? usageObj.prompt_tokens : 0;
  const outputTokens = typeof usageObj?.completion_tokens === "number" ? usageObj.completion_tokens : 0;

  if (debug) {
    console.log("OPENAI_USED", { model, inputTokens, outputTokens });
  }
  return {
    name: typeof obj?.name === "string" ? obj.name : null,
    amount: typeof obj?.amount === "number" ? obj.amount : null,
    type: obj?.type === "income" || obj?.type === "expense" ? (obj.type as "income" | "expense") : null,
    notes: typeof obj?.notes === "string" ? obj.notes : null,
    confidence: obj?.confidence === "high" || obj?.confidence === "medium" ? (obj.confidence as "high" | "medium") : "low",
    raw: { parser: "openai", model, usage: { inputTokens, outputTokens } },
  };
}
