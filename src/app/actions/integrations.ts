"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

function requireAdmin(role: "owner" | "admin" | "member") {
  if (role === "member") throw new Error("Sem permissão.");
}

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

export async function updateOrganizationFeatureConfigAction(input: z.input<typeof featureSchema>) {
  const auth = await requireAuthContext();
  requireAdmin(auth.role);
  const data = featureSchema.parse(input);

  await db.organizationFeatureConfig.upsert({
    where: { organizationId: auth.organization.id },
    create: { organizationId: auth.organization.id, ...data },
    update: data,
    select: { id: true },
  });

  await db.adminAuditLog.create({
    data: {
      organizationId: auth.organization.id,
      actorUserId: auth.user.id,
      action: "features.update",
      data,
    },
    select: { id: true },
  });

  revalidatePath("/settings");
}

const whatsappConnectionSchema = z.object({
  enabled: z.boolean(),
  whatsappPhoneNumberId: z.string().trim().optional().transform((v) => (v && v.length > 0 ? v : null)),
  whatsappBusinessAccountId: z.string().trim().optional().transform((v) => (v && v.length > 0 ? v : null)),
});

export async function upsertWhatsappConnectionAction(input: z.input<typeof whatsappConnectionSchema>) {
  const auth = await requireAuthContext();
  requireAdmin(auth.role);
  const parsed = whatsappConnectionSchema.parse(input);

  const status = parsed.enabled ? "active" : "disabled";

  await db.integrationConnection.upsert({
    where: { organizationId_type: { organizationId: auth.organization.id, type: "whatsapp" } },
    create: {
      organizationId: auth.organization.id,
      type: "whatsapp",
      status,
      whatsappPhoneNumberId: parsed.whatsappPhoneNumberId,
      whatsappBusinessAccountId: parsed.whatsappBusinessAccountId,
    },
    update: {
      status,
      whatsappPhoneNumberId: parsed.whatsappPhoneNumberId,
      whatsappBusinessAccountId: parsed.whatsappBusinessAccountId,
    },
    select: { id: true },
  });

  await db.adminAuditLog.create({
    data: {
      organizationId: auth.organization.id,
      actorUserId: auth.user.id,
      action: "integrations.whatsapp.upsert",
      data: parsed,
    },
    select: { id: true },
  });

  revalidatePath("/settings");
}

