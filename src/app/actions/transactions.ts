"use server";

import { db } from "@/lib/db";
import { parseMoneyToDecimal } from "@/lib/money";
import { transactionUpsertSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function toDateOnly(input: string) {
  const [y, m, d] = input.split("-").map((v) => Number(v));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export async function createTransaction(input: z.input<typeof transactionUpsertSchema>) {
  const parsed = transactionUpsertSchema.parse(input);
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  const isFixed = parsed.kind === "fixed";
  const isVariable = parsed.kind === "variable";

  const baseTx = {
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
  const parsed = transactionUpsertSchema.parse(input);
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  const isFixed = parsed.kind === "fixed";
  const isVariable = parsed.kind === "variable";

  await db.transaction.update({
    where: { id },
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

  revalidatePath("/");
  revalidatePath("/transactions");
}

export async function deleteTransaction(id: string) {
  await db.transaction.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/transactions");
}

