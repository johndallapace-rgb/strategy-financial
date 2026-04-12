function normalizeLine(line: string) {
  return line.replace(/^(\-|\*|•|\u2022)\s+/g, "").trim();
}

function isValidBatchItem(item: string) {
  const t = item.trim();
  if (!t) return false;
  const hasNumber = /\d/.test(t);
  const hasText = /\p{L}/u.test(t);
  return hasNumber && hasText;
}

function splitByComma(normalized: string) {
  if (!normalized.includes(",")) return null;
  const parts = normalized
    .split(/,\s+(?=\p{L})/gu)
    .map((p) => normalizeLine(p))
    .filter(Boolean);
  return parts.length >= 2 ? parts : null;
}

function splitBySemicolon(normalized: string) {
  if (!normalized.includes(";")) return null;
  const parts = normalized
    .split(/\s*;\s*/g)
    .map((p) => normalizeLine(p))
    .filter(Boolean);
  return parts.length >= 2 ? parts : null;
}

export function splitBatchMessage(text: string) {
  const normalized = String(text ?? "").replace(/\r/g, "").trim();
  if (!normalized) return [];

  const lines = normalized
    .split("\n")
    .map((l) => normalizeLine(l))
    .filter(Boolean)
    .filter(isValidBatchItem);
  if (lines.length >= 2) return lines;

  const byComma = splitByComma(normalized)?.filter(isValidBatchItem) ?? null;
  if (byComma && byComma.length >= 2) return byComma;

  const bySemicolon = splitBySemicolon(normalized)?.filter(isValidBatchItem) ?? null;
  if (bySemicolon && bySemicolon.length >= 2) return bySemicolon;

  return [normalized];
}
