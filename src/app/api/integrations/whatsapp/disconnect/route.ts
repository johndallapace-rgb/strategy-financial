import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

export const runtime = "nodejs";

function isIntegrationsAllowedByPlan(plan: string) {
  return plan === "pro" || plan === "enterprise";
}

export async function POST() {
  const auth = await requireAuthContext();
  if (auth.role === "member") return NextResponse.json({ success: false }, { status: 403 });

  const sub = await db.subscription.findUnique({
    where: { organizationId: auth.organization.id },
    select: { plan: true },
  });
  const plan = sub?.plan ?? "free";
  if (!isIntegrationsAllowedByPlan(plan)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  await db.integrationConnection.upsert({
    where: { organizationId_type: { organizationId: auth.organization.id, type: "whatsapp" } },
    create: { organizationId: auth.organization.id, type: "whatsapp", status: "disabled" },
    update: { status: "disabled", whatsappPhoneNumberId: null, whatsappBusinessAccountId: null },
    select: { id: true },
  });

  return NextResponse.json({ success: true });
}
