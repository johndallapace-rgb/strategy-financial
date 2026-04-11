import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const auth = await requireAuthContext();

  const [sub, conn] = await Promise.all([
    db.subscription.findUnique({
      where: { organizationId: auth.organization.id },
      select: { plan: true },
    }),
    db.integrationConnection.findUnique({
      where: { organizationId_type: { organizationId: auth.organization.id, type: "whatsapp" } },
      select: { status: true, whatsappPhoneNumberId: true },
    }),
  ]);

  const plan = sub?.plan ?? "free";
  const canConnect = plan === "pro" || plan === "enterprise";
  const connected = conn?.status === "active" && Boolean(conn.whatsappPhoneNumberId);

  return NextResponse.json({
    plan,
    canConnect,
    connected,
    phoneNumberId: conn?.whatsappPhoneNumberId ?? undefined,
    phone: null,
    profilePhone: auth.user.phone ?? null,
  });
}
