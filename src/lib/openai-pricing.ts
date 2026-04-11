type Rate = { inputUsdPer1M: number; outputUsdPer1M: number };

function getRate(model: string): Rate | null {
  const m = model.toLowerCase();
  if (m.includes("gpt-4o-mini")) return { inputUsdPer1M: 0.15, outputUsdPer1M: 0.6 };
  if (m === "gpt-4o") return { inputUsdPer1M: 5, outputUsdPer1M: 15 };
  return null;
}

export function estimateOpenAiCostCents({
  model,
  inputTokens,
  outputTokens,
}: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const rate = getRate(model);
  if (!rate) return { ok: false as const, costCents: 0 };

  const inputUsd = (Math.max(0, inputTokens) / 1_000_000) * rate.inputUsdPer1M;
  const outputUsd = (Math.max(0, outputTokens) / 1_000_000) * rate.outputUsdPer1M;
  const usd = inputUsd + outputUsd;
  const costCents = Math.round(usd * 100);
  return { ok: true as const, costCents };
}
