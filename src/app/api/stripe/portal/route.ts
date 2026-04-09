import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

function requireBillingAdmin(role: "owner" | "admin" | "member") {
  if (role === "member") throw new Error("Sem permissão.");
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}.`);
  return v;
}

function appUrl() {
  return requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
}

export async function POST() {
  try {
    const auth = await requireAuthContext();
    requireBillingAdmin(auth.role);

    const sub = await db.subscription.findUnique({
      where: { organizationId: auth.organization.id },
      select: { stripeCustomerId: true },
    });

    if (!sub?.stripeCustomerId) return NextResponse.json({ error: "no_customer" }, { status: 400 });

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl()}/billing?portal=success`,
    });

    return NextResponse.json({ url: portal.url });
  } catch {
    return NextResponse.json({ error: "unknown" }, { status: 400 });
  }
}
