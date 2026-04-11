import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { mapStripeBillingCycle, mapStripeStatus } from "@/lib/stripe-billing";

type SyncResult =
  | { ok: true; organizationId: string; applied: true }
  | { ok: true; organizationId: string; applied: false; reason: "out_of_order" }
  | { ok: true; organizationId: null; applied: false; reason: "missing_organization" };

async function syncStripeSubscription(subscriptionId: string, stripeEventCreatedAt: Date, organizationId?: string | null): Promise<SyncResult> {
  const stripe = getStripe();
  const sub = (await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] })) as unknown as Stripe.Subscription;

  const orgId =
    organizationId ??
    sub.metadata?.organizationId ??
    (await db.subscription
      .findUnique({ where: { stripeSubscriptionId: subscriptionId }, select: { organizationId: true } })
      .then((r) => r?.organizationId ?? null));

  if (!orgId) return { ok: true, organizationId: null, applied: false, reason: "missing_organization" };

  const item = sub.items.data[0];
  const price = item?.price;
  const interval = price?.recurring?.interval ?? null;
  const priceId = typeof price?.id === "string" ? price.id : null;
  const periodStart = item?.current_period_start ? new Date(item.current_period_start * 1000) : null;
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  const subscriptionCreatedAt = sub.created ? new Date(sub.created * 1000) : null;

  const priceBasic = process.env.STRIPE_PRICE_ID_BASIC;
  const pricePro = process.env.STRIPE_PRICE_ID_PRO;
  const priceStarter = process.env.STRIPE_PRICE_ID_STARTER;
  const mappedPlan = priceId && pricePro && priceId === pricePro ? ("pro" as const) : ("basic" as const);
  const mappedPriceOk = Boolean(priceId && (priceId === pricePro || priceId === priceBasic || priceId === priceStarter));

  const mappedStatus = mapStripeStatus(sub.status);
  type EffectivePlan = "free" | "basic" | "pro";

  let updateData = {
    plan: (mappedPriceOk ? mappedPlan : "basic") as EffectivePlan,
    status: mappedStatus,
    billingCycle: mapStripeBillingCycle(interval),
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
    stripeSubscriptionId: sub.id as string | null,
    stripePriceId: priceId as string | null,
    stripeSubscriptionCreatedAt: subscriptionCreatedAt,
    stripeLastEventCreatedAt: stripeEventCreatedAt,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  };

  const isFinalCancellation =
    mappedStatus === "canceled" && (!periodEnd || periodEnd.getTime() <= stripeEventCreatedAt.getTime());

  if (isFinalCancellation) {
    updateData = {
      ...updateData,
      plan: "free",
      status: "active",
      billingCycle: "monthly",
      stripeSubscriptionId: null,
      stripePriceId: null,
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const applied = await db.$transaction(async (tx) => {
    const exists = await tx.subscription.findUnique({
      where: { organizationId: orgId },
      select: { id: true },
    });

    if (!exists) {
      await tx.subscription.create({
        data: { organizationId: orgId, ...updateData },
        select: { id: true },
      });
      return true;
    }

    const where: Prisma.SubscriptionWhereInput & { AND: Prisma.SubscriptionWhereInput[] } = {
      organizationId: orgId,
      AND: [
        {
          OR: [{ stripeLastEventCreatedAt: null }, { stripeLastEventCreatedAt: { lte: stripeEventCreatedAt } }],
        },
      ],
    };

    if (subscriptionCreatedAt) {
      where.AND.push({
        OR: [{ stripeSubscriptionCreatedAt: null }, { stripeSubscriptionCreatedAt: { lte: subscriptionCreatedAt } }],
      });
    }

    const r = await tx.subscription.updateMany({
      where,
      data: updateData,
    });

    return r.count === 1;
  });

  if (!applied) return { ok: true, organizationId: orgId, applied: false, reason: "out_of_order" };
  return { ok: true, organizationId: orgId, applied: true };
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = (await headers()).get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ ok: false }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const stripeEventCreatedAt = new Date(event.created * 1000);

  try {
    try {
      await db.stripeWebhookEvent.create({
        data: { id: event.id, type: event.type, stripeCreatedAt: stripeEventCreatedAt, processedAt: null, attemptCount: 0 },
        select: { id: true },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
      const existing = await db.stripeWebhookEvent.findUnique({ where: { id: event.id }, select: { processedAt: true } });
      if (existing?.processedAt) return NextResponse.json({ ok: true });
    }

    await db.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { attemptCount: { increment: 1 } },
      select: { id: true },
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      const organizationId = session.metadata?.organizationId ?? null;
      if (subscriptionId) {
        const r = await syncStripeSubscription(subscriptionId, stripeEventCreatedAt, organizationId);
        if (!r.applied) {
          await db.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { outcome: "ignored_out_of_order", note: r.reason, organizationId: r.organizationId },
            select: { id: true },
          });
          await db.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { processedAt: new Date() },
            select: { id: true },
          });
          return NextResponse.json({ ok: true });
        }
      }
      await db.stripeWebhookEvent.update({
        where: { id: event.id },
        data: { organizationId },
        select: { id: true },
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const subscriptionId = typeof sub.id === "string" ? sub.id : null;
      const organizationId = sub.metadata?.organizationId ?? null;
      if (subscriptionId) {
        const r = await syncStripeSubscription(subscriptionId, stripeEventCreatedAt, organizationId);
        if (!r.applied) {
          await db.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { outcome: "ignored_out_of_order", note: r.reason, organizationId: r.organizationId },
            select: { id: true },
          });
          await db.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { processedAt: new Date() },
            select: { id: true },
          });
          return NextResponse.json({ ok: true });
        }
      }
      await db.stripeWebhookEvent.update({
        where: { id: event.id },
        data: { organizationId },
        select: { id: true },
      });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const parent = invoice.parent;
      let subscriptionId: string | null = null;
      let organizationId: string | null = null;
      if (parent && parent.type === "subscription_details" && parent.subscription_details) {
        const s = parent.subscription_details.subscription;
        subscriptionId = typeof s === "string" ? s : s.id;
        organizationId = parent.subscription_details.metadata?.organizationId ?? null;
      }
      if (subscriptionId) {
        const r = await syncStripeSubscription(subscriptionId, stripeEventCreatedAt, organizationId);
        if (!r.applied) {
          await db.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { outcome: "ignored_out_of_order", note: r.reason, organizationId: r.organizationId },
            select: { id: true },
          });
          await db.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { processedAt: new Date() },
            select: { id: true },
          });
          return NextResponse.json({ ok: true });
        }
      }
      await db.stripeWebhookEvent.update({
        where: { id: event.id },
        data: { organizationId },
        select: { id: true },
      });
    }

    await db.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
      select: { id: true },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
