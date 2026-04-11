"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/app/admin/actions/auth";

const featureSchema = z.object({
  whatsappEnabled: z.boolean(),
  whatsappReceiveText: z.boolean(),
  whatsappReceiveAudio: z.boolean(),
  whatsappReceiveImage: z.boolean(),
  openAiEnabled: z.boolean(),
  openAiTextParsing: z.boolean(),
  openAiAudioTranscription: z.boolean(),
  openAiImageUnderstanding: z.boolean(),
  autoReplyEnabled: z.boolean(),
  memoryLongEnabled: z.boolean(),
  multiAgentEnabled: z.boolean(),
  manualReviewRequired: z.boolean(),
  autoApprovalEnabled: z.boolean(),
  monthlyCostLimitCents: z.number().int().min(0).max(10_000_000),
});

function isIntegrationsAllowedByPlan(plan: string) {
  return plan === "pro" || plan === "enterprise";
}

export async function updateOrgFeatureConfigAdminAction(input: z.input<typeof featureSchema>) {
  const auth = await requireAdmin();
  const data = featureSchema.parse(input);
  const organizationId = auth.organization.id;
  const update = data;

  const sub = await db.subscription.findUnique({
    where: { organizationId },
    select: { plan: true },
  });
  const plan = sub?.plan ?? "free";
  if (!isIntegrationsAllowedByPlan(plan)) {
    const triesToEnable = update.whatsappEnabled || update.openAiEnabled;
    if (triesToEnable) throw new Error("WhatsApp e OpenAI estão disponíveis apenas no plano Completo.");
  }

  await db.organizationFeatureConfig.upsert({
    where: { organizationId },
    create: { organizationId, ...update },
    update,
    select: { id: true },
  });

  await db.adminAuditLog.create({
    data: {
      organizationId,
      actorUserId: auth.user.id,
      action: "admin.features.update",
      data,
    },
    select: { id: true },
  });

  revalidatePath("/admin/integrations");
}
