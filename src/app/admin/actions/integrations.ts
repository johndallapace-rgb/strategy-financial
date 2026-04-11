"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/app/admin/actions/auth";

const connectWhatsappSchema = z.object({
  whatsappPhoneNumberId: z.string().trim().min(1),
  whatsappBusinessAccountId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

function isIntegrationsAllowedByPlan(plan: string) {
  return plan === "pro" || plan === "enterprise";
}

export async function connectWhatsappAdminAction(input: z.input<typeof connectWhatsappSchema>) {
  const auth = await requireAdmin();
  const data = connectWhatsappSchema.parse(input);
  const organizationId = auth.organization.id;

  const sub = await db.subscription.findUnique({
    where: { organizationId },
    select: { plan: true },
  });
  const plan = sub?.plan ?? "free";
  if (!isIntegrationsAllowedByPlan(plan)) {
    throw new Error("WhatsApp disponível apenas no plano Completo.");
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const existingByPhoneNumber = await tx.integrationConnection.findFirst({
        where: { type: "whatsapp", whatsappPhoneNumberId: data.whatsappPhoneNumberId },
        select: { id: true, organizationId: true, organization: { select: { name: true } } },
      });

      const movedFromOrganizationName =
        existingByPhoneNumber && existingByPhoneNumber.organizationId !== organizationId
          ? existingByPhoneNumber.organization.name
          : null;

      if (existingByPhoneNumber && existingByPhoneNumber.organizationId !== organizationId) {
        await tx.integrationConnection.update({
          where: { id: existingByPhoneNumber.id },
          data: { whatsappPhoneNumberId: null, status: "disabled" },
          select: { id: true },
        });
      }

      const conn = await tx.integrationConnection.upsert({
        where: { organizationId_type: { organizationId, type: "whatsapp" } },
        create: {
          organizationId,
          type: "whatsapp",
          status: "active",
          whatsappPhoneNumberId: data.whatsappPhoneNumberId,
          whatsappBusinessAccountId: data.whatsappBusinessAccountId,
        },
        update: {
          status: "active",
          whatsappPhoneNumberId: data.whatsappPhoneNumberId,
          whatsappBusinessAccountId: data.whatsappBusinessAccountId,
        },
        select: { id: true },
      });

      return { connId: conn.id, movedFromOrganizationName };
    });

    await db.adminAuditLog.create({
      data: {
        organizationId,
        actorUserId: auth.user.id,
        action: "admin.integrations.whatsapp.connect",
        data: {
          whatsappPhoneNumberId: data.whatsappPhoneNumberId,
          whatsappBusinessAccountId: data.whatsappBusinessAccountId,
          movedFromOrganizationName: result.movedFromOrganizationName,
        },
      },
      select: { id: true },
    });

    revalidatePath("/admin/integrations");

    return { ok: true as const, connectionId: result.connId, movedFromOrganizationName: result.movedFromOrganizationName };
  } catch (err) {
    const isPrisma = err instanceof Prisma.PrismaClientKnownRequestError;
    const code = isPrisma ? err.code : null;
    console.error("connectWhatsappAdminAction failed", {
      code,
      organizationId,
      whatsappPhoneNumberId: data.whatsappPhoneNumberId,
    });

    if (code === "P2002") {
      throw new Error("Não foi possível conectar: phone_number_id já está em uso por outra organização.");
    }
    throw new Error(err instanceof Error ? err.message : "Erro ao conectar WhatsApp.");
  }
}
