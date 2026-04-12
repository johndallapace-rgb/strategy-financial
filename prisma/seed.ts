import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000000";

async function main() {
  await prisma.organization.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {},
    create: { id: DEFAULT_ORG_ID, name: "Workspace Principal", slug: "default" },
  });

  await prisma.account.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { name: "Carteira", type: "pf", isSystemDefault: true },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: DEFAULT_ORG_ID,
      name: "Carteira",
      type: "pf",
      isSystemDefault: true,
    },
  });

  await prisma.account.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: { name: "Nubank", type: "pf", isSystemDefault: false },
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      organizationId: DEFAULT_ORG_ID,
      name: "Nubank",
      type: "pf",
      isSystemDefault: false,
    },
  });

  await prisma.costCenter.createMany({
    data: [
      { organizationId: DEFAULT_ORG_ID, name: "Pessoal", isSystemDefault: true },
      { organizationId: DEFAULT_ORG_ID, name: "Empresa", isSystemDefault: true },
      { organizationId: DEFAULT_ORG_ID, name: "Administrativo", isSystemDefault: true },
      { organizationId: DEFAULT_ORG_ID, name: "Comercial", isSystemDefault: true },
    ],
    skipDuplicates: true,
  });

  const categories = [
    { name: "Market", type: "expense", color: "#EF4444", icon: "shopping-basket" },
    { name: "Rent", type: "expense", color: "#F97316", icon: "home" },
    { name: "Energy", type: "expense", color: "#F59E0B", icon: "zap" },
    { name: "Internet", type: "expense", color: "#3B82F6", icon: "wifi" },
    { name: "Employee", type: "expense", color: "#A855F7", icon: "users" },
    { name: "Phone", type: "expense", color: "#06B6D4", icon: "phone" },
    { name: "Fuel", type: "expense", color: "#64748B", icon: "fuel" },
    { name: "School", type: "expense", color: "#22C55E", icon: "graduation-cap" },
    { name: "Health Insurance", type: "expense", color: "#10B981", icon: "heart-handshake" },
    { name: "Products", type: "expense", color: "#8B5CF6", icon: "package" },
    { name: "Water", type: "expense", color: "#0EA5E9", icon: "droplet" },
    { name: "Operational Revenue", type: "income", color: "#22C55E", icon: "banknote" },
    { name: "Variable Revenue", type: "income", color: "#16A34A", icon: "trending-up" },
  ] as const;

  for (const category of categories) {
    await prisma.category.upsert({
      where: { organizationId_name_type: { organizationId: DEFAULT_ORG_ID, name: category.name, type: category.type } },
      update: { color: category.color, icon: category.icon },
      create: { ...category, organizationId: DEFAULT_ORG_ID },
    });
  }

  const allCategories = await prisma.category.findMany({
    where: { organizationId: DEFAULT_ORG_ID },
    select: { id: true, name: true, type: true },
  });
  const catId = (name: string, type: "income" | "expense") => {
    const found = allCategories.find((c) => c.name === name && c.type === type);
    if (!found) throw new Error(`Missing category seed: ${name} (${type})`);
    return found.id;
  };

  for (const entityType of ["pf", "pj"] as const) {
    await prisma.alertRule.upsert({
      where: { organizationId_entityType: { organizationId: DEFAULT_ORG_ID, entityType } },
      update: {},
      create: { organizationId: DEFAULT_ORG_ID, entityType, criticalPercent: 80 },
    });
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const dateOf = (monthOffset: number, day: number) => new Date(y, m + monthOffset, day);

  const recurringRules = [
    {
      id: "00000000-0000-0000-0000-000000000101",
      transactionName: "Rent",
      amount: "1800.00",
      type: "expense",
      entityType: "pf",
      source: "Housing",
      categoryId: catId("Rent", "expense"),
      dayOfMonth: 5,
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000102",
      transactionName: "Internet",
      amount: "149.90",
      type: "expense",
      entityType: "pj",
      source: "Office",
      categoryId: catId("Internet", "expense"),
      dayOfMonth: 10,
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000103",
      transactionName: "Employee Payroll",
      amount: "3200.00",
      type: "expense",
      entityType: "pj",
      source: "Payroll",
      categoryId: catId("Employee", "expense"),
      dayOfMonth: 30,
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000104",
      transactionName: "Operational Revenue (DP Automação)",
      amount: "16500.00",
      type: "income",
      entityType: "pj",
      source: "DP Automação",
      categoryId: catId("Operational Revenue", "income"),
      dayOfMonth: 1,
      active: true,
    },
  ] as const;

  for (const r of recurringRules) {
    await prisma.recurringRule.upsert({
      where: { id: r.id },
      update: {
        organizationId: DEFAULT_ORG_ID,
        transactionName: r.transactionName,
        amount: r.amount,
        type: r.type,
        entityType: r.entityType,
        source: r.source,
        categoryId: r.categoryId,
        dayOfMonth: r.dayOfMonth,
        active: r.active,
      },
      create: {
        id: r.id,
        organizationId: DEFAULT_ORG_ID,
        transactionName: r.transactionName,
        amount: r.amount,
        type: r.type,
        entityType: r.entityType,
        source: r.source,
        categoryId: r.categoryId,
        dayOfMonth: r.dayOfMonth,
        active: r.active,
      },
    });
  }

  const transactions: Array<{
    id: string;
    organizationId: string;
    name: string;
    amount: string;
    type: "income" | "expense";
    date: Date;
    isFixed: boolean;
    isVariable: boolean;
    entityType: "pf" | "pj";
    source: string;
    categoryId: string;
    accountId: string;
    recurringRuleId?: string;
    notes?: string;
  }> = [
    {
      id: "00000000-0000-0000-0000-000000001001",
      organizationId: DEFAULT_ORG_ID,
      name: "Operational Revenue · DP Automação",
      amount: "16500.00",
      type: "income",
      date: dateOf(0, 1),
      isFixed: true,
      isVariable: false,
      entityType: "pj",
      source: "DP Automação",
      categoryId: catId("Operational Revenue", "income"),
      accountId: "00000000-0000-0000-0000-000000000002",
      recurringRuleId: "00000000-0000-0000-0000-000000000104",
      notes: "Monthly contract (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001002",
      organizationId: DEFAULT_ORG_ID,
      name: "Rent",
      amount: "1800.00",
      type: "expense",
      date: dateOf(0, 5),
      isFixed: true,
      isVariable: false,
      entityType: "pf",
      source: "Housing",
      categoryId: catId("Rent", "expense"),
      accountId: "00000000-0000-0000-0000-000000000001",
      recurringRuleId: "00000000-0000-0000-0000-000000000101",
      notes: "Monthly rent (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001003",
      organizationId: DEFAULT_ORG_ID,
      name: "Office Internet",
      amount: "149.90",
      type: "expense",
      date: dateOf(0, 10),
      isFixed: true,
      isVariable: false,
      entityType: "pj",
      source: "Office",
      categoryId: catId("Internet", "expense"),
      accountId: "00000000-0000-0000-0000-000000000002",
      recurringRuleId: "00000000-0000-0000-0000-000000000102",
      notes: "Internet bill (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001004",
      organizationId: DEFAULT_ORG_ID,
      name: "Employee Payroll",
      amount: "3200.00",
      type: "expense",
      date: dateOf(0, 30),
      isFixed: true,
      isVariable: false,
      entityType: "pj",
      source: "Payroll",
      categoryId: catId("Employee", "expense"),
      accountId: "00000000-0000-0000-0000-000000000002",
      recurringRuleId: "00000000-0000-0000-0000-000000000103",
      notes: "Payroll (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001005",
      organizationId: DEFAULT_ORG_ID,
      name: "Airbnb Payout",
      amount: "2400.00",
      type: "income",
      date: dateOf(0, 7),
      isFixed: false,
      isVariable: true,
      entityType: "pf",
      source: "Airbnb",
      categoryId: catId("Variable Revenue", "income"),
      accountId: "00000000-0000-0000-0000-000000000001",
      notes: "Variable income (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001006",
      organizationId: DEFAULT_ORG_ID,
      name: "Ooba Sales",
      amount: "5400.00",
      type: "income",
      date: dateOf(0, 14),
      isFixed: false,
      isVariable: true,
      entityType: "pj",
      source: "Ooba",
      categoryId: catId("Variable Revenue", "income"),
      accountId: "00000000-0000-0000-0000-000000000002",
      notes: "Variable revenue (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001007",
      organizationId: DEFAULT_ORG_ID,
      name: "Market",
      amount: "285.70",
      type: "expense",
      date: dateOf(0, 3),
      isFixed: false,
      isVariable: true,
      entityType: "pf",
      source: "Supermarket",
      categoryId: catId("Market", "expense"),
      accountId: "00000000-0000-0000-0000-000000000001",
      notes: "Groceries (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001008",
      organizationId: DEFAULT_ORG_ID,
      name: "Fuel",
      amount: "210.40",
      type: "expense",
      date: dateOf(0, 12),
      isFixed: false,
      isVariable: true,
      entityType: "pf",
      source: "Shell",
      categoryId: catId("Fuel", "expense"),
      accountId: "00000000-0000-0000-0000-000000000001",
      notes: "Transportation (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001009",
      organizationId: DEFAULT_ORG_ID,
      name: "Products (inventory)",
      amount: "1250.00",
      type: "expense",
      date: dateOf(0, 18),
      isFixed: false,
      isVariable: true,
      entityType: "pj",
      source: "Supplier",
      categoryId: catId("Products", "expense"),
      accountId: "00000000-0000-0000-0000-000000000002",
      notes: "Restock (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001010",
      organizationId: DEFAULT_ORG_ID,
      name: "Health Insurance",
      amount: "420.00",
      type: "expense",
      date: dateOf(0, 22),
      isFixed: true,
      isVariable: false,
      entityType: "pf",
      source: "Insurance",
      categoryId: catId("Health Insurance", "expense"),
      accountId: "00000000-0000-0000-0000-000000000001",
      notes: "Monthly insurance (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001011",
      organizationId: DEFAULT_ORG_ID,
      name: "Last month · Market",
      amount: "312.35",
      type: "expense",
      date: dateOf(-1, 25),
      isFixed: false,
      isVariable: true,
      entityType: "pf",
      source: "Supermarket",
      categoryId: catId("Market", "expense"),
      accountId: "00000000-0000-0000-0000-000000000001",
      notes: "Previous month example (seed).",
    },
    {
      id: "00000000-0000-0000-0000-000000001012",
      organizationId: DEFAULT_ORG_ID,
      name: "Last month · Operational Revenue",
      amount: "15800.00",
      type: "income",
      date: dateOf(-1, 1),
      isFixed: true,
      isVariable: false,
      entityType: "pj",
      source: "DP Automação",
      categoryId: catId("Operational Revenue", "income"),
      accountId: "00000000-0000-0000-0000-000000000002",
      notes: "Previous month example (seed).",
    },
  ];

  for (const t of transactions) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {
        organizationId: t.organizationId,
        name: t.name,
        amount: t.amount,
        type: t.type,
        date: t.date,
        isFixed: t.isFixed,
        isVariable: t.isVariable,
        entityType: t.entityType,
        source: t.source,
        categoryId: t.categoryId,
        accountId: t.accountId,
        recurringRuleId: t.recurringRuleId ?? null,
        notes: t.notes ?? null,
      },
      create: {
        id: t.id,
        organizationId: t.organizationId,
        name: t.name,
        amount: t.amount,
        type: t.type,
        date: t.date,
        isFixed: t.isFixed,
        isVariable: t.isVariable,
        entityType: t.entityType,
        source: t.source,
        categoryId: t.categoryId,
        accountId: t.accountId,
        recurringRuleId: t.recurringRuleId ?? null,
        notes: t.notes ?? null,
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
