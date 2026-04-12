import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";
import { displayCategoryName } from "@/lib/ptbr";
import { listDefaultCategories, listDefaultSubcategories, seedDefaultCategoriesForOrganization } from "@/lib/default-categories";
import { CategoriesClient } from "@/app/(app)/categories/categories-client";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const auth = await requireAuthContext();

  const defaults = listDefaultCategories();
  const defaultSubs = listDefaultSubcategories();
  const existingDefaults = await db.category.findMany({
    where: {
      organizationId: auth.organization.id,
      OR: defaults.map((c) => ({ type: c.type, name: c.name })),
    },
    select: { type: true, name: true, isSystemDefault: true },
  });
  const existingKey = new Set(existingDefaults.map((c) => `${c.type}:${c.name}`));
  const missing = defaults.some((c) => !existingKey.has(`${c.type}:${c.name}`));
  const missingDefaultFlags = existingDefaults.some((c) => !c.isSystemDefault);

  const defaultCatsForSubs = defaultSubs.length
    ? await db.category.findMany({
        where: {
          organizationId: auth.organization.id,
          OR: Array.from(
            new Set(defaultSubs.map((s) => `${s.categoryType}:${s.categoryName}`))
          ).map((k) => {
            const [type, name] = k.split(":");
            return { type: type as "income" | "expense", name };
          }),
        },
        select: { id: true, type: true, name: true },
      })
    : [];

  const catIdByKey = new Map(defaultCatsForSubs.map((c) => [`${c.type}:${c.name}`, c.id] as const));
  const expectedPairs = defaultSubs
    .map((s) => {
      const categoryId = catIdByKey.get(`${s.categoryType}:${s.categoryName}`);
      return categoryId ? { categoryId, name: s.name } : null;
    })
    .filter(Boolean) as Array<{ categoryId: string; name: string }>;

  const existingSubs = expectedPairs.length
    ? await db.subcategory.findMany({
        where: { organizationId: auth.organization.id, OR: expectedPairs },
        select: { categoryId: true, name: true, isSystemDefault: true },
      })
    : [];
  const existingSubsKey = new Set(existingSubs.map((s) => `${s.categoryId}:${s.name}`));
  const missingSubcategories = expectedPairs.some((p) => !existingSubsKey.has(`${p.categoryId}:${p.name}`));
  const missingSubcategoryFlags = existingSubs.some((s) => !s.isSystemDefault);

  if (missing || missingSubcategories || missingDefaultFlags || missingSubcategoryFlags) {
    await seedDefaultCategoriesForOrganization(auth.organization.id);
    if (process.env.NODE_ENV !== "production") console.log("[CATEGORIES] Seed padrão aplicado para org existente");
  } else {
    if (process.env.NODE_ENV !== "production") console.log("[CATEGORIES] Seed já estava completo");
  }

  const categories = await db.category.findMany({
    where: { organizationId: auth.organization.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      color: true,
      icon: true,
      isSystemDefault: true,
      subcategories: { select: { id: true, name: true, isSystemDefault: true }, orderBy: { name: "asc" } },
    },
  });

  const categoriesUi = categories.map((c) => ({ ...c, name: displayCategoryName(c.name) }));

  return <CategoriesClient categories={categoriesUi} />;
}
