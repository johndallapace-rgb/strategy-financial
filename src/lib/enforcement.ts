"use server";

import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plans";
import { getMonthPeriod } from "@/lib/usage";

export async function getOrganizationUsage(orgId: string, date = new Date()) {
  const { start, end } = getMonthPeriod(date);

  const [whatsappMessages, drafts, aiRuns, aiErrors, aiCost] = await Promise.all([
    db.whatsappMessage.count({ where: { organizationId: orgId, receivedAt: { gte: start, lt: end } } }),
    db.smartDraft.count({ where: { organizationId: orgId, createdAt: { gte: start, lt: end } } }),
    db.aiExtraction.count({ where: { organizationId: orgId, createdAt: { gte: start, lt: end } } }),
    db.aiExtraction.count({ where: { organizationId: orgId, createdAt: { gte: start, lt: end }, status: "failed" } }),
    db.aiExtraction.aggregate({
      where: { organizationId: orgId, createdAt: { gte: start, lt: end } },
      _sum: { costCents: true },
    }),
  ]);

  return {
    periodStart: start,
    periodEnd: end,
    whatsappMessages,
    drafts,
    aiRuns,
    aiErrors,
    aiCostCents: aiCost._sum.costCents ?? 0,
  };
}

export async function getOrganizationPlan(orgId: string) {
  const sub = await db.subscription.findUnique({ where: { organizationId: orgId }, select: { plan: true } });
  return sub?.plan ?? "free";
}

export async function canUseFeature(orgId: string, key: "whatsapp_message" | "draft" | "ai_run") {
  const plan = await getOrganizationPlan(orgId);
  const limits = getPlanLimits(plan);
  const usage = await getOrganizationUsage(orgId);

  if (key === "whatsapp_message") return usage.whatsappMessages < limits.whatsappMessagesPerMonth;
  if (key === "draft") return usage.drafts < limits.draftsPerMonth;
  if (key === "ai_run") return usage.aiRuns < limits.aiRunsPerMonth;
  return false;
}

