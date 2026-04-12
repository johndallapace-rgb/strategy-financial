"use server";

import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";
import { parseMoneyToDecimal } from "@/lib/money";
import { transactionUpsertSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function toDateOnly(input: string) {
  const [y, m, d] = input.split("-").map((v) => Number(v));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export async function createTransaction(input: z.input<typeof transactionUpsertSchema>) {
  const auth = await requireAuthContext();
  const parsed = transactionUpsertSchema.parse(input);
  const draftId = typeof (input as { draftId?: unknown }).draftId === "string" ? (input as { draftId?: string }).draftId : null;
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  const dueDate = parsed.dueDate && parsed.dueDate.trim().length > 0 ? toDateOnly(parsed.dueDate) : null;

  const accountId = parsed.accountId
    ? parsed.accountId
    : (
        await db.account.findFirst({
          where: { organizationId: auth.organization.id, name: "Carteira" },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        })
      )?.id ??
      (
        await db.account.findFirst({
          where: { organizationId: auth.organization.id },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        })
      )?.id ?? null;
  if (!accountId) throw new Error("Cadastre uma conta antes de criar transações.");

  const costCenterId = parsed.costCenterId && parsed.costCenterId.trim().length > 0 ? parsed.costCenterId : null;
  const resolvedCostCenterId =
    costCenterId ??
    (
      await db.costCenter.findFirst({
        where: { organizationId: auth.organization.id, name: "Pessoal" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    )?.id ??
    (
      await db.costCenter.create({
        data: { organizationId: auth.organization.id, name: "Pessoal", isSystemDefault: true },
        select: { id: true },
      })
    ).id;

  const subcategoryId = parsed.subcategoryId && parsed.subcategoryId.trim().length > 0 ? parsed.subcategoryId : null;

  const [categoryOk, accountOk] = await Promise.all([
    db.category.count({ where: { id: parsed.categoryId, organizationId: auth.organization.id } }),
    db.account.count({ where: { id: accountId, organizationId: auth.organization.id } }),
  ]);
  if (!categoryOk) throw new Error("Categoria inválida.");
  if (!accountOk) throw new Error("Conta inválida.");

  if (subcategoryId) {
    const subOk = await db.subcategory.count({
      where: { id: subcategoryId, organizationId: auth.organization.id, categoryId: parsed.categoryId },
    });
    if (!subOk) throw new Error("Subcategoria inválida.");
  }

  const isFixed = parsed.kind === "fixed";
  const isVariable = parsed.kind === "variable";

  const baseTx = {
    organizationId: auth.organization.id,
    name: parsed.name,
    amount,
    type: parsed.type,
    date: toDateOnly(parsed.date),
    dueDate,
    isFixed,
    isVariable,
    entityType: parsed.entityType,
    source: parsed.source,
    categoryId: parsed.categoryId,
    subcategoryId,
    accountId,
    costCenterId: resolvedCostCenterId,
    notes: parsed.notes ? parsed.notes : null,
  } as const;

  if (parsed.makeRecurring && isFixed) {
    const dayOfMonth = parsed.dayOfMonth ?? Number(parsed.date.slice(8, 10));
    const rule = await db.recurringRule.create({
      data: {
        organizationId: auth.organization.id,
        transactionName: parsed.name,
        amount,
        type: parsed.type,
        entityType: parsed.entityType,
        source: parsed.source,
        categoryId: parsed.categoryId,
        dayOfMonth,
        active: true,
      },
      select: { id: true },
    });

    await db.transaction.create({
      data: { ...baseTx, recurringRuleId: rule.id },
    });
  } else {
    await db.transaction.create({ data: baseTx });
  }

  if (draftId && z.string().uuid().safeParse(draftId).success) {
    await db.smartDraft.updateMany({
      where: { id: draftId, organizationId: auth.organization.id, status: "pending_review" },
      data: { status: "applied" },
    });
  }

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function updateTransaction(id: string, input: z.input<typeof transactionUpsertSchema>) {
  const auth = await requireAuthContext();
  const parsed = transactionUpsertSchema.parse(input);
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  const dueDate = parsed.dueDate && parsed.dueDate.trim().length > 0 ? toDateOnly(parsed.dueDate) : null;

  const accountId = parsed.accountId
    ? parsed.accountId
    : (
        await db.account.findFirst({
          where: { organizationId: auth.organization.id, name: "Carteira" },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        })
      )?.id ??
      (
        await db.account.findFirst({
          where: { organizationId: auth.organization.id },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        })
      )?.id ?? null;
  if (!accountId) throw new Error("Cadastre uma conta antes de criar transações.");

  const costCenterId = parsed.costCenterId && parsed.costCenterId.trim().length > 0 ? parsed.costCenterId : null;
  const resolvedCostCenterId =
    costCenterId ??
    (
      await db.costCenter.findFirst({
        where: { organizationId: auth.organization.id, name: "Pessoal" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    )?.id ??
    (
      await db.costCenter.create({
        data: { organizationId: auth.organization.id, name: "Pessoal", isSystemDefault: true },
        select: { id: true },
      })
    ).id;

  const subcategoryId = parsed.subcategoryId && parsed.subcategoryId.trim().length > 0 ? parsed.subcategoryId : null;

  const [categoryOk, accountOk] = await Promise.all([
    db.category.count({ where: { id: parsed.categoryId, organizationId: auth.organization.id } }),
    db.account.count({ where: { id: accountId, organizationId: auth.organization.id } }),
  ]);
  if (!categoryOk) throw new Error("Categoria inválida.");
  if (!accountOk) throw new Error("Conta inválida.");

  if (subcategoryId) {
    const subOk = await db.subcategory.count({
      where: { id: subcategoryId, organizationId: auth.organization.id, categoryId: parsed.categoryId },
    });
    if (!subOk) throw new Error("Subcategoria inválida.");
  }

  const isFixed = parsed.kind === "fixed";
  const isVariable = parsed.kind === "variable";

  const result = await db.transaction.updateMany({
    where: { id, organizationId: auth.organization.id },
    data: {
      name: parsed.name,
      amount,
      type: parsed.type,
      date: toDateOnly(parsed.date),
      dueDate,
      isFixed,
      isVariable,
      entityType: parsed.entityType,
      source: parsed.source,
      categoryId: parsed.categoryId,
      subcategoryId,
      accountId,
      costCenterId: resolvedCostCenterId,
      notes: parsed.notes ? parsed.notes : null,
    },
  });
  if (result.count === 0) throw new Error("Transação não encontrada.");

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: string) {
  const auth = await requireAuthContext();
  const result = await db.transaction.deleteMany({ where: { id, organizationId: auth.organization.id } });
  if (result.count === 0) throw new Error("Transação não encontrada.");
  revalidatePath("/");
  revalidatePath("/transactions");
}
