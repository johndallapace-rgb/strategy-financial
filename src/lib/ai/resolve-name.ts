import { detectTypeByHeuristic } from "@/lib/ai/detect-type";

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveSafeTransactionName(text: string, parsedName: string | null | undefined) {
  const raw = typeof parsedName === "string" ? parsedName.trim() : "";
  if (raw.length >= 2) return { name: raw.slice(0, 120), source: "parser" as const };

  const normalized = normalizeText(text);
  const heuristic = detectTypeByHeuristic(normalized);
  if (heuristic.kind !== "income" || heuristic.strength !== "strong") return { name: null, source: "none" as const };

  if (normalized.includes("pix recebido")) return { name: "Pix recebido", source: "heuristic" as const };
  if (normalized.includes("cliente pagou")) return { name: "Cliente", source: "heuristic" as const };
  if (/\b(venda|vendi)\b/i.test(normalized)) return { name: "Venda", source: "heuristic" as const };
  if (/\bairbnb\b/i.test(normalized)) return { name: "Airbnb", source: "heuristic" as const };
  if (normalized.includes("comissao")) return { name: "Comissão", source: "heuristic" as const };
  if (/\b(recebi|recebido|recebimento)\b/i.test(normalized) || normalized.includes("pagamento recebido")) {
    return { name: "Recebimento", source: "heuristic" as const };
  }
  if (normalized.includes("entrada")) return { name: "Entrada", source: "heuristic" as const };

  return { name: "Receita", source: "heuristic" as const };
}
