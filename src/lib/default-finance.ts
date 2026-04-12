import { db } from "@/lib/db";
import { seedDefaultCategoriesForOrganization } from "@/lib/default-categories";

const DEFAULT_COST_CENTERS = [
  { name: "Pessoal", isSystemDefault: true },
  { name: "Empresa", isSystemDefault: true },
  { name: "Administrativo", isSystemDefault: true },
  { name: "Comercial", isSystemDefault: true },
] as const;

export async function seedDefaultFinanceForOrganization(organizationId: string) {
  await seedDefaultCategoriesForOrganization(organizationId);

  const wallet = await db.account.findFirst({
    where: { organizationId, name: "Carteira" },
    select: { id: true, isSystemDefault: true },
  });
  if (!wallet) {
    await db.account.create({
      data: { organizationId, name: "Carteira", type: "pf", isSystemDefault: true },
      select: { id: true },
    });
  } else if (!wallet.isSystemDefault) {
    await db.account.update({ where: { id: wallet.id }, data: { isSystemDefault: true }, select: { id: true } });
  }

  await db.costCenter.createMany({
    data: DEFAULT_COST_CENTERS.map((c) => ({ organizationId, name: c.name, isSystemDefault: true })),
    skipDuplicates: true,
  });
  await db.costCenter.updateMany({
    where: { organizationId, OR: DEFAULT_COST_CENTERS.map((c) => ({ name: c.name })) },
    data: { isSystemDefault: true },
  });
}

