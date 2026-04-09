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
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  const [categoryOk, accountOk] = await Promise.all([
    db.category.count({ where: { id: parsed.categoryId, organizationId: auth.organization.id } }),
    db.account.count({ where: { id: parsed.accountId, organizationId: auth.organization.id } }),
  ]);
  if (!categoryOk) throw new Error("Categoria inválida.");
  if (!accountOk) throw new Error("Conta inválida.");

  const isFixed = parsed.kind === "fixed";
  const isVariable = parsed.kind === "variable";

  const baseTx = {
    organizationId: auth.organization.id,
    name: parsed.name,
    amount,
    type: parsed.type,
    date: toDateOnly(parsed.date),
    isFixed,
    isVariable,
    entityType: parsed.entityType,
    source: parsed.source,
    categoryId: parsed.categoryId,
    accountId: parsed.accountId,
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

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function updateTransaction(id: string, input: z.input<typeof transactionUpsertSchema>) {
  const auth = await requireAuthContext();
  const parsed = transactionUpsertSchema.parse(input);
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  const [categoryOk, accountOk] = await Promise.all([
    db.category.count({ where: { id: parsed.categoryId, organizationId: auth.organization.id } }),
    db.account.count({ where: { id: parsed.accountId, organizationId: auth.organization.id } }),
  ]);
  if (!categoryOk) throw new Error("Categoria inválida.");
  if (!accountOk) throw new Error("Conta inválida.");

  const isFixed = parsed.kind === "fixed";
  const isVariable = parsed.kind === "variable";

  const result = await db.transaction.updateMany({
    where: { id, organizationId: auth.organization.id },
    data: {
      name: parsed.name,
      amount,
      type: parsed.type,
      date: toDateOnly(parsed.date),
      isFixed,
      isVariable,
      entityType: parsed.entityType,
      source: parsed.source,
      categoryId: parsed.categoryId,
      accountId: parsed.accountId,
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
