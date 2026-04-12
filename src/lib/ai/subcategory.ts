import { db } from "@/lib/db";

function normalizeForMatch(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pickFirstExisting(candidates: string[], normalizedToSub: Map<string, { id: string; name: string }>) {
  for (const c of candidates) {
    const found = normalizedToSub.get(normalizeForMatch(c));
    if (found) return found;
  }
  return null;
}

export function detectSubcategoryByHeuristic(text: string, categoryName: string) {
  const t = normalizeForMatch(text);
  const c = normalizeForMatch(categoryName);

  if (c.includes("transporte")) {
    if (t.includes("uber")) return ["Uber"];
    if (t.includes(" 99") || t.startsWith("99") || t.includes("taxi") || t.includes("táxi")) return ["Táxi", "Uber"];
    if (t.includes("gasolina") || t.includes("combustivel") || t.includes("combustível")) return ["Combustível"];
    if (t.includes("estacionamento")) return ["Estacionamento"];
    if (t.includes("pedagio") || t.includes("pedágio")) return ["Pedágio"];
    if (t.includes("manutencao") || t.includes("manutenção") || t.includes("oficina")) return ["Manutenção veículo"];
  }

  if (c.includes("saude") || c.includes("saúde")) {
    if (t.includes("farmacia") || t.includes("farmácia") || t.includes("remedio") || t.includes("remédio")) return ["Farmácia"];
    if (t.includes("exame")) return ["Exames"];
    if (t.includes("terapia")) return ["Terapia"];
    if (t.includes("dentista") || t.includes("odonto")) return ["Odontologia"];
    if (t.includes("plano")) return ["Plano de saúde"];
    if (t.includes("medico") || t.includes("médico") || t.includes("consulta") || t.includes("consultorio") || t.includes("consultório")) return ["Médico"];
  }

  if (c.includes("alimentacao") || c.includes("alimentação")) {
    if (t.includes("mercado") || t.includes("supermerc")) return ["Mercado"];
    if (t.includes("ifood") || t.includes("i-food")) return ["Ifood"];
    if (t.includes("restaurante")) return ["Restaurante"];
    if (t.includes("padaria")) return ["Padaria"];
    if (t.includes("cafe") || t.includes("café") || t.includes("cafeteria")) return ["Cafeteria"];
    if (t.includes("lanche")) return ["Lanche"];
  }

  if (c.includes("assinaturas")) {
    if (t.includes("spotify")) return ["Spotify"];
    if (t.includes("netflix")) return ["Netflix"];
    if (t.includes("prime")) return ["Streaming"];
    if (t.includes("streaming")) return ["Streaming"];
    if (t.includes("chatgpt")) return ["ChatGPT", "Software", "SaaS"];
  }

  if (c.includes("vendas")) {
    if (t.includes("venda") || t.includes("vendi")) return ["Venda à vista", "Venda online", "Venda"];
  }

  if (c.includes("servicos") || c.includes("serviços")) {
    if (t.includes("cliente pagou")) return ["Serviço avulso", "Contrato mensal", "Projeto fechado", "Serviços"];
  }

  if (c.includes("comissoes") || c.includes("comissões")) {
    if (t.includes("comissao") || t.includes("comissão")) return ["Comissão"];
  }

  if (c.includes("reembolsos")) {
    if (t.includes("reembolso")) return ["Reembolso"];
  }

  if (c.includes("receitas diversas")) {
    if (t.includes("pix recebido") || t.includes("recebi") || t.includes("recebido") || t.includes("entrada") || t.includes("pagamento recebido")) {
      return ["Receita eventual", "Receita", "Outros"];
    }
    if (t.includes("airbnb")) return ["Receita eventual", "Receita", "Outros"];
  }

  return [];
}

function matchesSubcategoryText(textNormalized: string, subNameNormalized: string) {
  if (!subNameNormalized) return false;
  if (subNameNormalized.length <= 2) return false;
  if (subNameNormalized.includes(" ")) return textNormalized.includes(subNameNormalized);
  const escaped = subNameNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i").test(textNormalized);
}

export async function resolveSubcategoryIdByText({
  organizationId,
  categoryId,
  categoryName,
  text,
  debug,
}: {
  organizationId: string;
  categoryId: string;
  categoryName: string;
  text: string;
  debug: boolean;
}) {
  const subcategories = await db.subcategory.findMany({
    where: { organizationId, categoryId },
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true },
  });
  if (!subcategories.length) {
    if (debug) console.log("[IA] Subcategoria não encontrada");
    return null;
  }

  const normalizedToSub = new Map<string, { id: string; name: string }>();
  for (const s of subcategories) normalizedToSub.set(normalizeForMatch(s.name), { id: s.id, name: s.name });

  const candidates = detectSubcategoryByHeuristic(text, categoryName);
  if (debug && candidates.length) console.log("[IA] Subcategoria sugerida:", candidates[0]);

  const byCandidate = candidates.length ? pickFirstExisting(candidates, normalizedToSub) : null;
  if (byCandidate) {
    if (debug) console.log("[IA] Subcategoria encontrada no banco:", byCandidate.id);
    return byCandidate;
  }

  const t = normalizeForMatch(text);
  const sorted = subcategories
    .slice()
    .sort((a, b) => normalizeForMatch(b.name).length - normalizeForMatch(a.name).length);

  for (const s of sorted) {
    const n = normalizeForMatch(s.name);
    if (matchesSubcategoryText(t, n)) {
      if (debug) console.log("[IA] Subcategoria encontrada no banco:", s.id);
      return { id: s.id, name: s.name };
    }
  }

  if (debug) console.log("[IA] Subcategoria não encontrada");
  return null;
}
