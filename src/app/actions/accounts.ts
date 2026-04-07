"use server";

import { db } from "@/lib/db";
import { accountUpsertSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createAccount(input: z.input<typeof accountUpsertSchema>) {
  const data = accountUpsertSchema.parse(input);
  await db.account.create({ data });
  revalidatePath("/settings");
}

export async function updateAccount(id: string, input: z.input<typeof accountUpsertSchema>) {
  const data = accountUpsertSchema.parse(input);
  await db.account.update({ where: { id }, data });
  revalidatePath("/settings");
}

export async function deleteAccount(id: string) {
  const txCount = await db.transaction.count({ where: { accountId: id } });
  if (txCount > 0) throw new Error("Não é possível excluir uma conta com transações.");
  await db.account.delete({ where: { id } });
  revalidatePath("/settings");
}

