import type Stripe from "stripe";
import type { BillingCycle, SubscriptionStatus } from "@prisma/client";

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "trialing") return "trialing";
  if (status === "active") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  return "inactive";
}

export function mapStripeBillingCycle(interval: Stripe.Price.Recurring.Interval | null | undefined): BillingCycle {
  if (interval === "year") return "yearly";
  return "monthly";
}

