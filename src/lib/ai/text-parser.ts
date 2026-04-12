"use server";

import { formatBRL } from "@/lib/money";
import { detectTypeByHeuristic } from "@/lib/ai/detect-type";
import { isProbablyMultiTransactionMessage } from "@/lib/ai/detect-multi";

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
  const isMulti = normalized.length > 0 && isProbablyMultiTransactionMessage(normalized);
  if (isMulti) {
    return {
      name: null,
      amount: null,
      type: null,
      confidence: "low",
      raw: { parser: "heuristic", multi: true, preview: normalized.slice(0, 220) },
    };
  }
  const amountMatch = normalized.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d{2})?)/);
  const amount =
    amountMatch?.[1] != null
      ? Number(amountMatch[1].replace(/\./g, "").replace(",", "."))
      : null;

  const byHeuristic = detectTypeByHeuristic(normalized);
  const type =
    byHeuristic.kind === "income" ? ("income" as const) : byHeuristic.kind === "expense" ? ("expense" as const) : null;

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
  if (isProbablyMultiTransactionMessage(text)) return heuristicParse(text);
  if (!apiKey) return heuristicParse(text);

  const debug = process.env.OPENAI_DEBUG === "1";

  const system =
    "Você extrai dados estruturados de mensagens curtas em pt-BR sobre transações financeiras. " +
    "Retorne somente JSON válido seguindo o schema exato. " +
    "Regra de negócio: income = dinheiro entrando; expense = dinheiro saindo. " +
    "Se estiver em dúvida entre income e expense, escolha o mais provável com base no texto (não chute aleatório). " +
    "Se a mensagem contiver múltiplos lançamentos (várias linhas/itens/valores), retorne confidence = low e type = null.";

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
    "\n\nClassifique o campo type usando exatamente estas regras:\n" +
    "- income: dinheiro entrou/recebi/entrada/pagamento recebido/cliente pagou/venda\n" +
    "- expense: dinheiro saiu/paguei/gasto/conta/boleto/uber/mercado/assinaturas\n" +
    "\nExemplos:\n" +
    '- "Recebi 2000 do Airbnb" -> income\n' +
    '- "Airbnb 1990" -> prefira income quando parecer recebimento/plataforma de receita\n' +
    '- "Venda 500" -> income\n' +
    '- "Pix recebido 300" -> income\n' +
    '- "Cliente pagou 1000" -> income\n' +
    '- "Uber 30" -> expense\n' +
    '- "Médico 450" -> expense\n' +
    '- "Mercado 100" -> expense\n' +
    "\nDica: valores em BRL podem aparecer como " +
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

  const openAiType = obj?.type === "income" || obj?.type === "expense" ? (obj.type as "income" | "expense") : null;
  const openAiConfidence = obj?.confidence === "high" || obj?.confidence === "medium" ? (obj.confidence as "high" | "medium") : "low";
  const heuristic = detectTypeByHeuristic(text);
  const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;

  const forceMatches =
    heuristic.kind === "income" || heuristic.kind === "expense"
      ? heuristic.matches.some((m) =>
          [
            "venda",
            "vendi",
            "recebi",
            "recebido",
            "pix recebido",
            "pagamento recebido",
            "cliente pagou",
            "faturamento",
            "entrada",
            "airbnb",
            "medico",
            "uber",
            "mercado",
            "ifood",
            "spotify",
            "gas",
            "aluguel",
            "conta",
            "boleto",
            "fornecedor",
            "farmacia",
            "exame",
          ].includes(m),
        )
      : false;

  let resolvedType = openAiType;
  let typeSource: "parser" | "heuristic" | "fallback" = "parser";

  if (!resolvedType && heuristicType) {
    resolvedType = heuristicType;
    typeSource = "heuristic";
  } else if (
    resolvedType &&
    heuristicType &&
    resolvedType !== heuristicType &&
    heuristic.kind !== "ambiguous" &&
    heuristic.kind !== "none" &&
    heuristic.strength === "strong" &&
    (forceMatches || openAiConfidence !== "high")
  ) {
    resolvedType = heuristicType;
    typeSource = "heuristic";
  }

  if (debug) {
    console.log("OPENAI_USED", { model, inputTokens, outputTokens });
    console.log("[IA] Type vindo do parser:", openAiType ?? "null");
    if (typeSource === "heuristic") console.log("[IA] Type fallback por heurística:", resolvedType);
    console.log("[IA] Type final resolvido:", resolvedType ?? "null");
    if (heuristic.kind === "ambiguous") console.log("[IA] Mensagem ambígua para type, usando fallback");
  }
  return {
    name: typeof obj?.name === "string" ? obj.name : null,
    amount: typeof obj?.amount === "number" ? obj.amount : null,
    type: resolvedType,
    notes: typeof obj?.notes === "string" ? obj.notes : null,
    confidence: openAiConfidence,
    raw: { parser: "openai", model, usage: { inputTokens, outputTokens } },
  };
}
