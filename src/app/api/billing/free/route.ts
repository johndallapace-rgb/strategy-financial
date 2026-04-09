import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

function requireBillingAdmin(role: "owner" | "admin" | "member") {
  if (role === "member") throw new Error("Sem permissão.");
}

export async function POST() {
  try {
    const auth = await requireAuthContext();
    requireBillingAdmin(auth.role);

    const existing = await db.subscription.findUnique({
      where: { organizationId: auth.organization.id },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    });

    if (existing?.stripeSubscriptionId) {
      return NextResponse.json({ ok: false, code: "active_subscription" }, { status: 400 });
    }

    await db.subscription.upsert({
      where: { organizationId: auth.organization.id },
      create: {
        organizationId: auth.organization.id,
        plan: "free",
        status: "active",
        billingCycle: "monthly",
        stripeCustomerId: existing?.stripeCustomerId ?? null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      update: {
        plan: "free",
        status: "active",
        stripeSubscriptionId: null,
        stripePriceId: null,
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

