import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { endOfMonth, startOfMonth } from "date-fns";

export type Entity = "pf" | "pj";
export type TxType = "income" | "expense";

export type DashboardCard = {
  income: number;
  expense: number;
  net: number;
  balance: number;
};

export type CategorySlice = {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: number;
};

export type TimeseriesPoint = {
  date: string;
  income: number;
  expense: number;
};

export type AlertItem = {
  entityType: Entity;
  percent: number;
  criticalPercent: number;
  income: number;
  expense: number;
};

function toNumber(value: Prisma.Decimal | null | undefined) {
  if (!value) return 0;
  return Number(value.toString());
}

export async function ensureRecurringTransactionsForMonth(organizationId: string, baseDate: Date) {
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);

  const rules = await db.recurringRule.findMany({
    where: { organizationId, active: true },
    select: {
      id: true,
      transactionName: true,
      amount: true,
      type: true,
      entityType: true,
      source: true,
      categoryId: true,
      dayOfMonth: true,
    },
  });

  if (!rules.length) return;

  const lastDay = Number(monthEnd.getDate());

  const accountByEntity = await db.account.findMany({
    where: { organizationId },
    select: { id: true, type: true },
  });

  const defaultAccountId: Record<Entity, string | null> = { pf: null, pj: null };
  for (const a of accountByEntity) {
    if (a.type === "pf" && !defaultAccountId.pf) defaultAccountId.pf = a.id;
    if (a.type === "pj" && !defaultAccountId.pj) defaultAccountId.pj = a.id;
  }

  const creates = rules
    .map((r) => {
      const accountId = defaultAccountId[r.entityType];
      if (!accountId) return null;

      const day = Math.min(Math.max(r.dayOfMonth, 1), lastDay);
      const date = new Date(monthStart);
      date.setDate(day);

      return {
        organizationId,
        name: r.transactionName,
        amount: r.amount,
        type: r.type,
        date,
        isFixed: true,
        isVariable: false,
        entityType: r.entityType,
        source: r.source,
        categoryId: r.categoryId,
        accountId,
        recurringRuleId: r.id,
      };
    })
    .filter(Boolean) as Array<Prisma.TransactionCreateManyInput>;

  if (!creates.length) return;

  await db.transaction.createMany({
    data: creates,
    skipDuplicates: true,
  });
}

export async function getDashboardData(organizationId: string, baseDate: Date) {
  const start = startOfMonth(baseDate);
  const end = endOfMonth(baseDate);

  const [alertRules, monthAgg, balanceAgg] = await Promise.all([
    db.alertRule.findMany({
      where: { organizationId },
      select: { entityType: true, criticalPercent: true },
    }),
    db.transaction.groupBy({
      by: ["entityType", "type"],
      where: { organizationId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.transaction.groupBy({
      by: ["entityType", "type"],
      where: { organizationId, date: { lte: end } },
      _sum: { amount: true },
    }),
  ]);

  const ruleByEntity: Record<Entity, number> = { pf: 80, pj: 80 };
  for (const r of alertRules) ruleByEntity[r.entityType] = r.criticalPercent;

  const monthByEntity: Record<Entity, Record<TxType, number>> = {
    pf: { income: 0, expense: 0 },
    pj: { income: 0, expense: 0 },
  };

  for (const row of monthAgg) monthByEntity[row.entityType][row.type] = toNumber(row._sum.amount);

  const balanceByEntity: Record<Entity, Record<TxType, number>> = {
    pf: { income: 0, expense: 0 },
    pj: { income: 0, expense: 0 },
  };

  for (const row of balanceAgg) balanceByEntity[row.entityType][row.type] = toNumber(row._sum.amount);

  const cardFor = (entity: Entity): DashboardCard => {
    const income = monthByEntity[entity].income;
    const expense = monthByEntity[entity].expense;
    const net = income - expense;
    const balance = balanceByEntity[entity].income - balanceByEntity[entity].expense;
    return { income, expense, net, balance };
  };

  const pf = cardFor("pf");
  const pj = cardFor("pj");

  const total: DashboardCard = {
    income: pf.income + pj.income,
    expense: pf.expense + pj.expense,
    net: pf.net + pj.net,
    balance: pf.balance + pj.balance,
  };

  const alerts: AlertItem[] = (["pf", "pj"] as const)
    .map((entityType) => {
      const income = monthByEntity[entityType].income;
      const expense = monthByEntity[entityType].expense;
      const criticalPercent = ruleByEntity[entityType] ?? 80;
      if (income <= 0) return null;

      const percent = Math.round((expense / income) * 100);
      if (percent < criticalPercent) return null;

      return { entityType, percent, criticalPercent, income, expense };
    })
    .filter(Boolean) as AlertItem[];

  const fixedVar = await db.transaction.groupBy({
    by: ["type", "isFixed"],
    where: { organizationId, date: { gte: start, lte: end } },
    _sum: { amount: true },
  });

  const fixed = {
    income: 0,
    expense: 0,
  };

  const variable = {
    income: 0,
    expense: 0,
  };

  for (const row of fixedVar) {
    if (row.isFixed) fixed[row.type] = toNumber(row._sum.amount);
    else variable[row.type] = toNumber(row._sum.amount);
  }

  const byCategory = await db.transaction.groupBy({
    by: ["categoryId"],
    where: { organizationId, date: { gte: start, lte: end }, type: "expense" },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  const categories = byCategory.length
    ? await db.category.findMany({
        where: { organizationId, id: { in: byCategory.map((c) => c.categoryId) } },
        select: { id: true, name: true, color: true, icon: true },
      })
    : [];

  const catById = new Map(categories.map((c) => [c.id, c]));

  const categorySlices: CategorySlice[] = byCategory
    .map((row) => {
      const cat = catById.get(row.categoryId);
      if (!cat) return null;
      return {
        categoryId: row.categoryId,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        total: toNumber(row._sum.amount),
      };
    })
    .filter(Boolean) as CategorySlice[];

  const dayAgg = await db.transaction.groupBy({
    by: ["date", "type"],
    where: { organizationId, date: { gte: start, lte: end } },
    _sum: { amount: true },
    orderBy: { date: "asc" },
  });

  const byDate = new Map<string, TimeseriesPoint>();
  for (const row of dayAgg) {
    const d = row.date.toISOString().slice(0, 10);
    const current = byDate.get(d) ?? { date: d, income: 0, expense: 0 };
    current[row.type] = toNumber(row._sum.amount);
    byDate.set(d, current);
  }

  const timeseries = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  const projection = await projectNextMonth(organizationId, balanceByEntity, baseDate);

  return {
    range: { start, end },
    total,
    pf,
    pj,
    alerts,
    fixed,
    variable,
    categorySlices,
    timeseries,
    projection,
  };
}

async function projectNextMonth(
  organizationId: string,
  balanceByEntity: Record<Entity, Record<TxType, number>>,
  baseDate: Date,
) {
  const nextStart = startOfMonth(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));
  const nextEnd = endOfMonth(nextStart);

  const currentStart = startOfMonth(baseDate);
  const currentEnd = endOfMonth(baseDate);

  const fixedAgg = await db.transaction.groupBy({
    by: ["entityType", "type"],
    where: { organizationId, date: { gte: currentStart, lte: currentEnd }, isFixed: true },
    _sum: { amount: true },
  });

  const expected: Record<Entity, Record<TxType, number>> = {
    pf: { income: 0, expense: 0 },
    pj: { income: 0, expense: 0 },
  };

  for (const row of fixedAgg) expected[row.entityType][row.type] = toNumber(row._sum.amount);

  const projectedByEntity: Record<Entity, number> = {
    pf: balanceByEntity.pf.income - balanceByEntity.pf.expense + expected.pf.income - expected.pf.expense,
    pj: balanceByEntity.pj.income - balanceByEntity.pj.expense + expected.pj.income - expected.pj.expense,
  };

  return {
    range: { start: nextStart, end: nextEnd },
    expected,
    projectedByEntity,
    projectedTotal: projectedByEntity.pf + projectedByEntity.pj,
  };
}
