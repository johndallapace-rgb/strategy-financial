function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type DetectResult =
  | { kind: "none" }
  | { kind: "ambiguous"; incomeMatches: string[]; expenseMatches: string[] }
  | { kind: "income"; strength: "weak" | "strong"; matches: string[] }
  | { kind: "expense"; strength: "weak" | "strong"; matches: string[] };

const INCOME_PHRASES = [
  "pix recebido",
  "pagamento recebido",
  "cliente pagou",
  "reembolso recebido",
  "diaria recebida",
  "aluguel recebido",
  "comissao recebida",
];

const INCOME_WORDS = [
  "venda",
  "vendi",
  "recebi",
  "recebido",
  "recebimento",
  "pix",
  "cliente",
  "pagamento",
  "faturamento",
  "entrada",
  "comissao",
  "airbnb",
];

const EXPENSE_PHRASES = ["paguei", "conta", "boleto", "pagamento aluguel"];

const EXPENSE_WORDS = [
  "pago",
  "pagar",
  "gastei",
  "medico",
  "uber",
  "ifood",
  "mercado",
  "farmacia",
  "exame",
  "aluguel",
  "gas",
  "luz",
  "agua",
  "internet",
  "spotify",
  "netflix",
  "fornecedor",
];

function countMatches(text: string, phrases: string[], words: string[]) {
  const matches: string[] = [];
  let score = 0;

  for (const p of phrases) {
    if (text.includes(p)) {
      matches.push(p);
      score += 2;
    }
  }

  for (const w of words) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) {
      matches.push(w);
      score += w.length >= 6 ? 2 : 1;
    }
  }

  return { score, matches };
}

export function detectTypeByHeuristic(text: string): DetectResult {
  const normalized = normalizeText(text);
  if (!normalized) return { kind: "none" };

  const income = countMatches(normalized, INCOME_PHRASES, INCOME_WORDS);
  const expense = countMatches(normalized, EXPENSE_PHRASES, EXPENSE_WORDS);

  if (income.score === 0 && expense.score === 0) return { kind: "none" };

  const incomeForce = income.matches.some((m) =>
    ["venda", "vendi", "recebi", "recebido", "pix recebido", "pagamento recebido", "cliente pagou", "faturamento", "entrada", "airbnb"].includes(m),
  );
  const expenseForce = expense.matches.some((m) =>
    ["medico", "uber", "mercado", "ifood", "spotify", "gas", "aluguel", "conta", "boleto", "fornecedor", "farmacia", "exame"].includes(m),
  );

  if (incomeForce && !expenseForce) {
    return { kind: "income", strength: "strong", matches: income.matches };
  }
  if (expenseForce && !incomeForce) {
    return { kind: "expense", strength: "strong", matches: expense.matches };
  }

  if (income.score > 0 && expense.score === 0) {
    return { kind: "income", strength: income.score >= 3 ? "strong" : "weak", matches: income.matches };
  }

  if (expense.score > 0 && income.score === 0) {
    return { kind: "expense", strength: expense.score >= 3 ? "strong" : "weak", matches: expense.matches };
  }

  if (incomeForce && expenseForce) {
    return { kind: "ambiguous", incomeMatches: income.matches, expenseMatches: expense.matches };
  }

  const diff = income.score - expense.score;
  if (diff >= 2) return { kind: "income", strength: "strong", matches: income.matches };
  if (diff <= -2) return { kind: "expense", strength: "strong", matches: expense.matches };

  return { kind: "ambiguous", incomeMatches: income.matches, expenseMatches: expense.matches };
}
