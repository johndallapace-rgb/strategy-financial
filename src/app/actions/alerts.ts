"use server";

import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";
import { alertRuleSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function upsertAlertRule(input: z.input<typeof alertRuleSchema>) {
  const auth = await requireAuthContext();
  const data = alertRuleSchema.parse(input);
  await db.alertRule.upsert({
    where: { organizationId_entityType: { organizationId: auth.organization.id, entityType: data.entityType } },
    update: { criticalPercent: data.criticalPercent },
    create: { ...data, organizationId: auth.organization.id },
  });
  revalidatePath("/");
  revalidatePath("/settings");
}
