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

function env(name: string) {
  return process.env[name] || null;
}

function appUrl() {
  return requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthContext();
    requireBillingAdmin(auth.role);

    const stripe = getStripe();
    const url = new URL(req.url);
    const plan = url.searchParams.get("plan");
    const wantsPro = plan === "pro";
    const priceId = wantsPro
      ? env("STRIPE_PRICE_ID_PRO") ?? env("STRIPE_PRICE_ID_BASIC") ?? requireEnv("STRIPE_PRICE_ID_STARTER")
      : env("STRIPE_PRICE_ID_BASIC") ?? requireEnv("STRIPE_PRICE_ID_STARTER");
    const selectedPlan = wantsPro ? "pro" : "basic";

    const sub = await db.subscription.findUnique({
      where: { organizationId: auth.organization.id },
      select: { stripeCustomerId: true },
    });

    const customerId =
      sub?.stripeCustomerId ??
      (
        await stripe.customers.create({
          name: auth.organization.name,
          metadata: { organizationId: auth.organization.id },
        })
      ).id;

    if (!sub?.stripeCustomerId) {
      await db.subscription.upsert({
        where: { organizationId: auth.organization.id },
        create: {
          organizationId: auth.organization.id,
          plan: selectedPlan,
          status: "inactive",
          billingCycle: "monthly",
          stripeCustomerId: customerId,
        },
        update: { stripeCustomerId: customerId },
        select: { id: true },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: auth.organization.id,
      success_url: `${appUrl()}/billing?checkout=success`,
      cancel_url: `${appUrl()}/billing?checkout=cancel`,
      metadata: { organizationId: auth.organization.id },
      subscription_data: {
        metadata: { organizationId: auth.organization.id },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ url: null }, { status: 400 });
  }
}
