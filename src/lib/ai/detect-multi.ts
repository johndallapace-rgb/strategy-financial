import { splitBatchMessage } from "@/lib/ai/split-batch";

export function isProbablyMultiTransactionMessage(text: string) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return false;

  const hasNewline = normalized.includes("\n") || normalized.includes("\r");
  const hasComma = normalized.includes(",");
  const hasSemicolon = normalized.includes(";");
  if (!hasNewline && !hasComma && !hasSemicolon) return false;

  const items = splitBatchMessage(normalized);
  return items.length >= 2;
}
