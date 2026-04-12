"use server";

import { db } from "@/lib/db";
import { categoryUpsertSchema } from "@/lib/validation";
import { requireAuthContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createCategory(input: z.input<typeof categoryUpsertSchema>) {
  const auth = await requireAuthContext();
  const data = categoryUpsertSchema.parse(input);
  const created = await db.category.create({
    data: { ...data, organizationId: auth.organization.id, isSystemDefault: false },
    select: { id: true },
  });
  revalidatePath("/categories");
  revalidatePath("/transactions");
  return created.id;
}

export async function updateCategory(id: string, input: z.input<typeof categoryUpsertSchema>) {
  const auth = await requireAuthContext();
  const data = categoryUpsertSchema.parse(input);
  const existing = await db.category.findFirst({
    where: { id, organizationId: auth.organization.id },
    select: { id: true, isSystemDefault: true },
  });
  if (!existing) throw new Error("Categoria não encontrada.");
  if (existing.isSystemDefault) throw new Error("Esta categoria é padrão do sistema e não pode ser editada.");

  const result = await db.category.updateMany({ where: { id, organizationId: auth.organization.id }, data });
  if (result.count === 0) throw new Error("Categoria não encontrada.");
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

export async function deleteCategory(id: string) {
  const auth = await requireAuthContext();
  const existing = await db.category.findFirst({
    where: { id, organizationId: auth.organization.id },
    select: { id: true, isSystemDefault: true },
  });
  if (!existing) throw new Error("Categoria não encontrada.");
  if (existing.isSystemDefault) throw new Error("Esta categoria é padrão do sistema e não pode ser excluída.");

  const txCount = await db.transaction.count({ where: { organizationId: auth.organization.id, categoryId: id } });
  if (txCount > 0) throw new Error("Não é possível excluir uma categoria com transações.");
  const result = await db.category.deleteMany({ where: { id, organizationId: auth.organization.id } });
  if (result.count === 0) throw new Error("Categoria não encontrada.");
  revalidatePath("/categories");
  revalidatePath("/transactions");
}

const subcategorySchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
});

export async function listSubcategories(categoryId: string) {
  const auth = await requireAuthContext();
  if (!z.string().uuid().safeParse(categoryId).success) throw new Error("Categoria inválida.");

  const category = await db.category.findFirst({
    where: { id: categoryId, organizationId: auth.organization.id },
    select: { id: true },
  });
  if (!category) throw new Error("Categoria não encontrada.");

  return db.subcategory.findMany({
    where: { organizationId: auth.organization.id, categoryId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isSystemDefault: true },
  });
}

export async function createSubcategory(input: z.input<typeof subcategorySchema>) {
  const auth = await requireAuthContext();
  const data = subcategorySchema.parse(input);

  const category = await db.category.findFirst({
    where: { id: data.categoryId, organizationId: auth.organization.id },
    select: { id: true, isSystemDefault: true },
  });
  if (!category) throw new Error("Categoria não encontrada.");
  if (category.isSystemDefault) throw new Error("Esta categoria é padrão do sistema e não pode receber subcategorias.");

  await db.subcategory.create({
    data: { organizationId: auth.organization.id, categoryId: data.categoryId, name: data.name, isSystemDefault: false },
    select: { id: true },
  });

  revalidatePath("/categories");
}

export async function deleteSubcategory(id: string) {
  const auth = await requireAuthContext();
  if (!z.string().uuid().safeParse(id).success) throw new Error("Subcategoria inválida.");

  const existing = await db.subcategory.findFirst({
    where: { id, organizationId: auth.organization.id },
    select: { id: true, isSystemDefault: true },
  });
  if (!existing) throw new Error("Subcategoria não encontrada.");
  if (existing.isSystemDefault) throw new Error("Esta subcategoria é padrão do sistema e não pode ser excluída.");

  const result = await db.subcategory.deleteMany({
    where: { id, organizationId: auth.organization.id },
  });
  if (result.count === 0) throw new Error("Subcategoria não encontrada.");

  revalidatePath("/categories");
}
