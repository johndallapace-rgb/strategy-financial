"use server";

import { db } from "@/lib/db";
import { accountUpsertSchema } from "@/lib/validation";
import { requireAuthContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createAccount(input: z.input<typeof accountUpsertSchema>) {
  const auth = await requireAuthContext();
  const data = accountUpsertSchema.parse(input);
  await db.account.create({ data: { ...data, organizationId: auth.organization.id } });
  revalidatePath("/settings");
}

export async function updateAccount(id: string, input: z.input<typeof accountUpsertSchema>) {
  const auth = await requireAuthContext();
  const data = accountUpsertSchema.parse(input);
  const result = await db.account.updateMany({ where: { id, organizationId: auth.organization.id }, data });
  if (result.count === 0) throw new Error("Conta não encontrada.");
  revalidatePath("/settings");
}

export async function deleteAccount(id: string) {
  const auth = await requireAuthContext();
  const txCount = await db.transaction.count({ where: { organizationId: auth.organization.id, accountId: id } });
  if (txCount > 0) throw new Error("Não é possível excluir uma conta com transações.");
  const result = await db.account.deleteMany({ where: { id, organizationId: auth.organization.id } });
  if (result.count === 0) throw new Error("Conta não encontrada.");
  revalidatePath("/settings");
}
