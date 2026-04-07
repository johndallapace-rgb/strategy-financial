"use server";

import { db } from "@/lib/db";
import { categoryUpsertSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createCategory(input: z.input<typeof categoryUpsertSchema>) {
  const data = categoryUpsertSchema.parse(input);
  await db.category.create({ data });
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function updateCategory(id: string, input: z.input<typeof categoryUpsertSchema>) {
  const data = categoryUpsertSchema.parse(input);
  await db.category.update({ where: { id }, data });
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function deleteCategory(id: string) {
  const txCount = await db.transaction.count({ where: { categoryId: id } });
  if (txCount > 0) throw new Error("Não é possível excluir uma categoria com transações.");
  await db.category.delete({ where: { id } });
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

