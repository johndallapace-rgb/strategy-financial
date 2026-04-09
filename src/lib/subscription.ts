import { db } from "@/lib/db";

export type SubscriptionAccess =
  | { ok: true }
  | { ok: false; reason: "missing" | "inactive" | "trial_expired" | "period_ended" };

export async function getSubscriptionAccess(organizationId: string): Promise<SubscriptionAccess> {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
  });

  if (!sub) return { ok: true };

  const now = Date.now();
  if (sub.status === "trialing") {
    if (sub.trialEndsAt && sub.trialEndsAt.getTime() <= now) return { ok: false, reason: "trial_expired" };
    return { ok: true };
  }

  if (sub.status === "active") {
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() <= now) return { ok: false, reason: "period_ended" };
    return { ok: true };
  }

  return { ok: false, reason: "inactive" };
}

