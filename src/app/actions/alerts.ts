"use server";

import { db } from "@/lib/db";
import { alertRuleSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function upsertAlertRule(input: z.input<typeof alertRuleSchema>) {
  const data = alertRuleSchema.parse(input);
  await db.alertRule.upsert({
    where: { entityType: data.entityType },
    update: { criticalPercent: data.criticalPercent },
    create: data,
  });
  revalidatePath("/");
  revalidatePath("/settings");
}

