"use server";

import { db } from "@/lib/db";
import { categoryUpsertSchema } from "@/lib/validation";
import { requireAuthContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createCategory(input: z.input<typeof categoryUpsertSchema>) {
  const auth = await requireAuthContext();
  const data = categoryUpsertSchema.parse(input);
  await db.category.create({ data: { ...data, organizationId: auth.organization.id } });
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function updateCategory(id: string, input: z.input<typeof categoryUpsertSchema>) {
  const auth = await requireAuthContext();
  const data = categoryUpsertSchema.parse(input);
  const result = await db.category.updateMany({ where: { id, organizationId: auth.organization.id }, data });
  if (result.count === 0) throw new Error("Categoria não encontrada.");
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function deleteCategory(id: string) {
  const auth = await requireAuthContext();
  const txCount = await db.transaction.count({ where: { organizationId: auth.organization.id, categoryId: id } });
  if (txCount > 0) throw new Error("Não é possível excluir uma categoria com transações.");
  const result = await db.category.deleteMany({ where: { id, organizationId: auth.organization.id } });
  if (result.count === 0) throw new Error("Categoria não encontrada.");
  revalidatePath("/categories");
  revalidatePath("/transactions");
}
