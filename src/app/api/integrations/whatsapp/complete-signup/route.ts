import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  phoneNumberId: z.string().trim().min(1),
  businessAccountId: z.string().trim().min(1),
});

function isIntegrationsAllowedByPlan(plan: string) {
  return plan === "pro" || plan === "enterprise";
}

async function verifyOwnershipWithMeta({
  graphToken,
  graphVersion,
  businessAccountId,
  phoneNumberId,
}: {
  graphToken: string;
  graphVersion: string;
  businessAccountId: string;
  phoneNumberId: string;
}) {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${businessAccountId}/phone_numbers`);
  const res = await fetch(url.toString(), { method: "GET", headers: { authorization: `Bearer ${graphToken}` } });
  if (!res.ok) return { ok: false as const };
  const json = (await res.json().catch(() => null)) as { data?: Array<{ id?: string }> } | null;
  const found = Boolean(json?.data?.some((p) => p.id === phoneNumberId));
  return found ? ({ ok: true as const } as const) : ({ ok: false as const } as const);
}

export async function POST(req: Request) {
  const auth = await requireAuthContext();
  if (auth.role === "member") return NextResponse.json({ success: false }, { status: 403 });

  const sub = await db.subscription.findUnique({
    where: { organizationId: auth.organization.id },
    select: { plan: true },
  });
  const plan = sub?.plan ?? "free";
  if (!isIntegrationsAllowedByPlan(plan)) return NextResponse.json({ success: false }, { status: 403 });

  const body = bodySchema.parse(await req.json().catch(() => ({})));
  const phoneNumberId = body.phoneNumberId;
  const businessAccountId = body.businessAccountId;

  const graphToken = process.env.META_GRAPH_TOKEN || null;
  const graphVersion = process.env.META_GRAPH_VERSION || "v21.0";
  if (!graphToken) {
    return NextResponse.json({ success: false }, { status: 503 });
  }

  const verified = await verifyOwnershipWithMeta({ graphToken, graphVersion, businessAccountId, phoneNumberId });
  if (!verified.ok) return NextResponse.json({ success: false }, { status: 401 });

  await db.$transaction(async (tx) => {
    const existingByPhoneNumber = await tx.integrationConnection.findFirst({
      where: { type: "whatsapp", whatsappPhoneNumberId: phoneNumberId },
      select: { id: true, organizationId: true },
    });

    if (existingByPhoneNumber && existingByPhoneNumber.organizationId !== auth.organization.id) {
      await tx.integrationConnection.update({
        where: { id: existingByPhoneNumber.id },
        data: { whatsappPhoneNumberId: null, status: "disabled" },
        select: { id: true },
      });
    }

    await tx.integrationConnection.upsert({
      where: { organizationId_type: { organizationId: auth.organization.id, type: "whatsapp" } },
      create: {
        organizationId: auth.organization.id,
        type: "whatsapp",
        status: "active",
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: businessAccountId,
      },
      update: {
        status: "active",
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: businessAccountId,
      },
      select: { id: true },
    });
  });

  await db.adminAuditLog.create({
    data: {
      organizationId: auth.organization.id,
      actorUserId: auth.user.id,
      action: "integrations.whatsapp.complete_signup",
      data: { phoneNumberId, businessAccountId },
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true });
}
