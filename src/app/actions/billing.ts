"use server";

import { redirect } from "next/navigation";
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

export async function startCheckoutAction() {
  const auth = await requireAuthContext();
  requireBillingAdmin(auth.role);

  const stripe = getStripe();
  const priceId = requireEnv("STRIPE_PRICE_ID_STARTER");

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
        plan: "starter",
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
    success_url: `${appUrl()}/settings?checkout=success`,
    cancel_url: `${appUrl()}/billing?checkout=cancel`,
    metadata: { organizationId: auth.organization.id },
    subscription_data: {
      metadata: { organizationId: auth.organization.id },
    },
  });

  if (!session.url) throw new Error("Stripe session missing url.");
  redirect(session.url);
}

export async function openCustomerPortalAction() {
  const auth = await requireAuthContext();
  requireBillingAdmin(auth.role);

  const stripe = getStripe();
  const sub = await db.subscription.findUnique({
    where: { organizationId: auth.organization.id },
    select: { stripeCustomerId: true },
  });

  if (!sub?.stripeCustomerId) redirect("/billing");

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl()}/settings`,
  });

  redirect(portal.url);
}
