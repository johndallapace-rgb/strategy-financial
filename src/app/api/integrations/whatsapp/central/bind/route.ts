import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  phone: z.string().trim().min(8),
});

function normalizeDigits(input: string) {
  return input.replace(/\D/g, "");
}

function isBasic(plan: string) {
  return plan === "basic" || plan === "starter";
}

export async function POST(req: Request) {
  const auth = await requireAuthContext();
  if (auth.role === "member") return NextResponse.json({ success: false }, { status: 403 });

  const sub = await db.subscription.findUnique({
    where: { organizationId: auth.organization.id },
    select: { plan: true },
  });
  const plan = sub?.plan ?? "free";
  if (!isBasic(plan)) return NextResponse.json({ success: false }, { status: 403 });

  const body = bodySchema.parse(await req.json().catch(() => ({})));
  const phoneDigits = normalizeDigits(body.phone);
  if (phoneDigits.length < 10 || phoneDigits.length > 16) {
    return NextResponse.json({ success: false, error: "Telefone inválido." }, { status: 400 });
  }

  const existing = await db.whatsappCentralBinding.findFirst({
    where: { phoneDigits, organizationId: { not: auth.organization.id } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ success: false, error: "Este telefone já está vinculado a outro cliente." }, { status: 409 });

  await db.whatsappCentralBinding.upsert({
    where: { phoneDigits },
    create: {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      phoneDigits,
      status: "active",
    },
    update: {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      status: "active",
    },
    select: { id: true },
  });

  await db.adminAuditLog.create({
    data: {
      organizationId: auth.organization.id,
      actorUserId: auth.user.id,
      action: "integrations.whatsapp.central_bind",
      data: { phoneDigits },
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true });
}
