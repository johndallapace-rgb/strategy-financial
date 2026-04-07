"use server";

import { db } from "@/lib/db";
import { parseMoneyToDecimal } from "@/lib/money";
import { recurringRuleUpsertSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createRecurringRule(input: z.input<typeof recurringRuleUpsertSchema>) {
  const parsed = recurringRuleUpsertSchema.parse(input);
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  await db.recurringRule.create({
    data: {
      transactionName: parsed.transactionName,
      amount,
      type: parsed.type,
      entityType: parsed.entityType,
      source: parsed.source,
      categoryId: parsed.categoryId,
      dayOfMonth: parsed.dayOfMonth,
      active: parsed.active,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function updateRecurringRule(id: string, input: z.input<typeof recurringRuleUpsertSchema>) {
  const parsed = recurringRuleUpsertSchema.parse(input);
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  await db.recurringRule.update({
    where: { id },
    data: {
      transactionName: parsed.transactionName,
      amount,
      type: parsed.type,
      entityType: parsed.entityType,
      source: parsed.source,
      categoryId: parsed.categoryId,
      dayOfMonth: parsed.dayOfMonth,
      active: parsed.active,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function deleteRecurringRule(id: string) {
  await db.recurringRule.delete({ where: { id } });
  revalidatePath("/settings");
  revalidatePath("/");
}

