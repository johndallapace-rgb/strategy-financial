"use server";

import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";
import { parseMoneyToDecimal } from "@/lib/money";
import { recurringRuleUpsertSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createRecurringRule(input: z.input<typeof recurringRuleUpsertSchema>) {
  const auth = await requireAuthContext();
  const parsed = recurringRuleUpsertSchema.parse(input);
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  await db.recurringRule.create({
    data: {
      organizationId: auth.organization.id,
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
  const auth = await requireAuthContext();
  const parsed = recurringRuleUpsertSchema.parse(input);
  const amount = parseMoneyToDecimal(parsed.amount);
  if (!amount) throw new Error("Valor inválido.");

  const result = await db.recurringRule.updateMany({
    where: { id, organizationId: auth.organization.id },
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
  if (result.count === 0) throw new Error("Regra recorrente não encontrada.");

  revalidatePath("/settings");
  revalidatePath("/");
}

export async function deleteRecurringRule(id: string) {
  const auth = await requireAuthContext();
  const result = await db.recurringRule.deleteMany({ where: { id, organizationId: auth.organization.id } });
  if (result.count === 0) throw new Error("Regra recorrente não encontrada.");
  revalidatePath("/settings");
  revalidatePath("/");
}
