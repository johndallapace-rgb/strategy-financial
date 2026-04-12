"use server";

import { db } from "@/lib/db";
import { costCenterUpsertSchema } from "@/lib/validation";
import { requireAuthContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createCostCenter(input: z.input<typeof costCenterUpsertSchema>) {
  const auth = await requireAuthContext();
  const data = costCenterUpsertSchema.parse(input);
  await db.costCenter.create({ data: { ...data, organizationId: auth.organization.id, isSystemDefault: false } });
  revalidatePath("/settings");
}

export async function updateCostCenter(id: string, input: z.input<typeof costCenterUpsertSchema>) {
  const auth = await requireAuthContext();
  const data = costCenterUpsertSchema.parse(input);
  const existing = await db.costCenter.findFirst({
    where: { id, organizationId: auth.organization.id },
    select: { id: true, isSystemDefault: true },
  });
  if (!existing) throw new Error("Centro de custo não encontrado.");
  if (existing.isSystemDefault) throw new Error("Este centro de custo é padrão do sistema e não pode ser editado.");
  const result = await db.costCenter.updateMany({ where: { id, organizationId: auth.organization.id }, data });
  if (result.count === 0) throw new Error("Centro de custo não encontrado.");
  revalidatePath("/settings");
}

export async function deleteCostCenter(id: string) {
  const auth = await requireAuthContext();
  const existing = await db.costCenter.findFirst({
    where: { id, organizationId: auth.organization.id },
    select: { id: true, isSystemDefault: true },
  });
  if (!existing) throw new Error("Centro de custo não encontrado.");
  if (existing.isSystemDefault) throw new Error("Este centro de custo é padrão do sistema e não pode ser excluído.");
  const txCount = await db.transaction.count({ where: { organizationId: auth.organization.id, costCenterId: id } });
  if (txCount > 0) throw new Error("Não é possível excluir um centro de custo com transações.");
  const result = await db.costCenter.deleteMany({ where: { id, organizationId: auth.organization.id } });
  if (result.count === 0) throw new Error("Centro de custo não encontrado.");
  revalidatePath("/settings");
}
