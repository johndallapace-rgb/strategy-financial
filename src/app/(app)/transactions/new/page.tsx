import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { displayCategoryName, displaySourceName } from "@/lib/ptbr";
import { requireAuthContext } from "@/lib/auth";
import { seedDefaultFinanceForOrganization } from "@/lib/default-finance";
import { detectTypeByHeuristic } from "@/lib/ai/detect-type";
import { isProbablyMultiTransactionMessage } from "@/lib/ai/detect-multi";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeForMatch(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatAmountToInput(amount: number) {
  return amount.toFixed(2).replace(".", ",");
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function resolveSearchParams(input: unknown) {
  const maybeThenable = input && typeof input === "object" ? (input as { then?: unknown }) : null;
  const params = maybeThenable && typeof maybeThenable.then === "function" ? await (input as Promise<unknown>) : input;
  return params && typeof params === "object" ? (params as Record<string, unknown>) : null;
}

export default async function NewTransactionPage({ searchParams }: { searchParams?: Promise<unknown> | Record<string, unknown> }) {
  const params = await resolveSearchParams(searchParams);
  const auth = await requireAuthContext();
  await seedDefaultFinanceForOrganization(auth.organization.id);

  const [categories, subcategories, accounts, costCenters, sources] = await Promise.all([
    db.category.findMany({
      where: { organizationId: auth.organization.id },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    db.subcategory.findMany({
      where: { organizationId: auth.organization.id },
      select: { id: true, name: true, categoryId: true },
      orderBy: { name: "asc" },
    }),
    db.account.findMany({
      where: { organizationId: auth.organization.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.costCenter.findMany({
      where: { organizationId: auth.organization.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.transaction.findMany({
      where: { organizationId: auth.organization.id },
      select: { source: true },
      distinct: ["source"],
      orderBy: { source: "asc" },
      take: 200,
    }),
  ]);

  const categoriesUi = categories.map((c) => ({ ...c, name: displayCategoryName(c.name) }));
  const sourcesUi = sources.map((s) => displaySourceName(s.source));

  const defaultCategoryOfType = (type: "income" | "expense") => categories.find((c) => c.type === type)?.id ?? categories[0]?.id ?? "";
  const defaultAccount = accounts.find((a) => normalizeForMatch(a.name) === "carteira")?.id ?? accounts[0]?.id ?? "";
  const defaultCostCenter = costCenters.find((c) => normalizeForMatch(c.name) === "pessoal")?.id ?? costCenters[0]?.id ?? "";

  const categoriesById = new Map(categories.map((c) => [c.id, c.type] as const));
  const accountsById = new Set(accounts.map((a) => a.id));
  const subById = new Map(subcategories.map((s) => [s.id, s.categoryId] as const));

  const draftId = typeof params?.draftId === "string" && isUuid(params.draftId) ? params.draftId : null;
  const draft = draftId
    ? await db.smartDraft.findFirst({
        where: { id: draftId, organizationId: auth.organization.id },
        select: { id: true, originalText: true, parsed: true, status: true },
      })
    : null;

  const originalText = typeof draft?.originalText === "string" ? draft.originalText : "";
  const isMulti = originalText && isProbablyMultiTransactionMessage(originalText);
  const debug = process.env.OPENAI_DEBUG === "1";
  if (isMulti && debug) console.log("[IA] Mensagem com múltiplos lançamentos detectada");

  const parsed =
    draft?.parsed && typeof draft.parsed === "object" && !Array.isArray(draft.parsed) ? (draft.parsed as Record<string, unknown>) : null;
  const parsedType = parsed?.type;
  const parsedName = parsed?.name;
  const parsedAmount = parsed?.amount;
  const parsedSource = parsed?.source;
  const parsedNotes = parsed?.notes;
  const parsedCategoryId = parsed?.categoryId;
  const parsedAccountId = parsed?.accountId;
  const parsedSubcategoryId = parsed?.subcategoryId;
  const parsedCostCenterId = parsed?.costCenterId;
  const parsedCategory = parsed?.category;
  const parsedAccount = parsed?.account;
  const parsedSubcategory = parsed?.subcategory;
  const parsedCostCenter = parsed?.costCenter;

  const heuristic = detectTypeByHeuristic(typeof draft?.originalText === "string" ? draft.originalText : "");
  const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
  const resolvedType = isMulti
    ? "expense"
    : parsedType === "income" || parsedType === "expense"
      ? parsedType
      : heuristicType && heuristic.kind !== "ambiguous"
        ? heuristicType
        : "expense";
  const resolvedNameRaw =
    !isMulti && typeof parsedName === "string" && parsedName.trim().length > 0
      ? parsedName
      : originalText && originalText.trim().length > 0
        ? originalText
        : "Transação";
  const resolvedName = resolvedNameRaw.trim().length >= 2 ? resolvedNameRaw.trim().slice(0, 120) : "Transação";
  const resolvedAmount =
    !isMulti && typeof parsedAmount === "number" && Number.isFinite(parsedAmount) && parsedAmount > 0
      ? formatAmountToInput(parsedAmount)
      : !isMulti && typeof parsedAmount === "string"
        ? parsedAmount
        : "0,00";
  const resolvedSource =
    !isMulti && typeof parsedSource === "string" && parsedSource.trim().length >= 2 ? parsedSource : "WhatsApp";
  const resolvedNotes =
    !isMulti && typeof parsedNotes === "string" && parsedNotes.trim().length > 0
      ? parsedNotes
      : originalText;
  const resolvedEntityType = "pf";

  let resolvedCategoryId =
    !isMulti &&
    typeof parsedCategoryId === "string" &&
    isUuid(parsedCategoryId) &&
    categoriesById.get(parsedCategoryId) === resolvedType
      ? parsedCategoryId
      : "";
  if (!isMulti && !resolvedCategoryId && typeof parsedCategory === "string") {
    const target = normalizeForMatch(parsedCategory);
    const found =
      categories.find((c) => c.type === resolvedType && normalizeForMatch(c.name) === target) ??
      categoriesUi.find((c) => c.type === resolvedType && normalizeForMatch(c.name) === target);
    resolvedCategoryId = found?.id ?? "";
  }
  if (!resolvedCategoryId) resolvedCategoryId = defaultCategoryOfType(resolvedType);

  let resolvedAccountId =
    !isMulti && typeof parsedAccountId === "string" && isUuid(parsedAccountId) && accountsById.has(parsedAccountId)
      ? parsedAccountId
      : "";
  if (!isMulti && !resolvedAccountId && typeof parsedAccount === "string") {
    const target = normalizeForMatch(parsedAccount);
    const found = accounts.find((a) => normalizeForMatch(a.name) === target);
    resolvedAccountId = found?.id ?? "";
  }
  if (!resolvedAccountId) resolvedAccountId = defaultAccount;

  let resolvedSubcategoryId =
    !isMulti &&
    typeof parsedSubcategoryId === "string" &&
    isUuid(parsedSubcategoryId) &&
    subById.get(parsedSubcategoryId) === resolvedCategoryId
      ? parsedSubcategoryId
      : "";
  if (!isMulti && !resolvedSubcategoryId && typeof parsedSubcategory === "string") {
    const target = normalizeForMatch(parsedSubcategory);
    const found = subcategories.find((s) => s.categoryId === resolvedCategoryId && normalizeForMatch(s.name) === target);
    resolvedSubcategoryId = found?.id ?? "";
  }

  let resolvedCostCenterId =
    !isMulti && typeof parsedCostCenterId === "string" && isUuid(parsedCostCenterId) ? parsedCostCenterId : "";
  if (!isMulti && !resolvedCostCenterId && typeof parsedCostCenter === "string") {
    const target = normalizeForMatch(parsedCostCenter);
    const found = costCenters.find((c) => normalizeForMatch(c.name) === target);
    resolvedCostCenterId = found?.id ?? "";
  }
  if (!resolvedCostCenterId) resolvedCostCenterId = defaultCostCenter;

  return (
    <Card className="max-w-3xl bg-card/70 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">Nova transação</CardTitle>
      </CardHeader>
      <CardContent>
        <TransactionForm
          initial={{
            draftId: draft?.id ?? undefined,
            name: resolvedName,
            amount: resolvedAmount,
            type: resolvedType,
            date: todayIso(),
            dueDate: "",
            entityType: resolvedEntityType,
            source: resolvedSource,
            categoryId: resolvedCategoryId,
            subcategoryId: resolvedSubcategoryId,
            accountId: resolvedAccountId,
            costCenterId: resolvedCostCenterId,
            notes: resolvedNotes,
            kind: "variable",
            makeRecurring: false,
          }}
          categories={categoriesUi}
          subcategories={subcategories}
          accounts={accounts}
          costCenters={costCenters}
          sources={sourcesUi}
          submitLabel="Criar transação"
        />
      </CardContent>
    </Card>
  );
}
