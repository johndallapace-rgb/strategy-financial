import { requireAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { ManageSubscriptionCta } from "@/components/billing/manage-subscription-cta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanGrid } from "@/components/billing/plan-grid";
import { t, type I18nKey } from "@/lib/i18n";

type Plan = "free" | "starter" | "basic" | "pro" | "enterprise";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const checkout = typeof sp.checkout === "string" ? sp.checkout : undefined;
  const portal = typeof sp.portal === "string" ? sp.portal : undefined;

  const auth = await requireAuthContext();
  const sub = await db.subscription.findUnique({
    where: { organizationId: auth.organization.id },
    select: {
      plan: true,
      status: true,
      billingCycle: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  const canManageBilling = auth.role === "owner" || auth.role === "admin";
  const hasStripe = Boolean(sub?.stripeCustomerId);
  const hasPortal = Boolean(sub?.stripeCustomerId && sub?.stripeSubscriptionId);
  const isActive = sub?.status === "active" || sub?.status === "trialing";
  const isPastDue = sub?.status === "past_due";
  const showCheckoutSuccess = checkout === "success";
  const showCheckoutCanceled = checkout === "cancel";
  const showPortalReturn = portal === "success";

  const tKey = (key: string) => t(key as I18nKey);
  const planLabel = sub?.plan ? tKey(`subscription.plan.${sub.plan}`) : t("common.emDash");
  const statusLabel = sub?.status ? tKey(`subscription.status.${sub.status}`) : t("common.emDash");
  const cycleLabel = sub?.billingCycle ? tKey(`subscription.cycle.${sub.billingCycle}`) : t("common.emDash");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-screen-lg space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{t("billing.requiredTitle")}</h2>
            <div className="mt-1 text-sm text-muted-foreground">{t("billing.choosePlanSubtitle")}</div>
          </div>
          {!canManageBilling ? (
            <Button className="h-10 rounded-xl" disabled>
              {t("billing.onlyOwnerAdmin")}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="border-white/10 bg-card/30 backdrop-blur lg:col-span-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">{t("nav.billing")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {showCheckoutSuccess ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{t("billing.checkoutSuccess")}</div>
              ) : null}
              {showCheckoutCanceled ? (
                <div className="rounded-xl border bg-card/40 px-3 py-2 text-sm text-muted-foreground">{t("billing.checkoutCanceled")}</div>
              ) : null}
              {showPortalReturn ? (
                <div className="rounded-xl border bg-card/40 px-3 py-2 text-sm text-muted-foreground">{t("billing.portalReturn")}</div>
              ) : null}
              {isPastDue ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("billing.pastDue")}</div>
              ) : null}

              <div className="rounded-2xl border bg-background/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t("billing.companyLabel")}</div>
                  <div className="text-muted-foreground">{auth.organization.name}</div>
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground">{t("billing.planLabel")}</div>
                    <Badge variant="secondary">{planLabel}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground">{t("billing.statusLabel")}</div>
                    <Badge variant={sub?.status === "trialing" || sub?.status === "active" ? "secondary" : "outline"}>
                      {statusLabel}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground">{t("billing.cycleLabel")}</div>
                    <div className="text-muted-foreground">{cycleLabel}</div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {hasStripe
                  ? t("billing.manageHint")
                  : isActive
                    ? t("billing.accessTemporarilyOk")
                    : t("billing.inactiveHint")}
              </div>

              {hasPortal ? <ManageSubscriptionCta className="h-11 w-full rounded-xl" /> : null}
            </CardContent>
          </Card>

          <div className="lg:col-span-8">
            {showCheckoutSuccess ? (
              <div className="sr-only">{t("billing.checkoutSuccess")}</div>
            ) : null}
            <PlanGrid
              canManageBilling={canManageBilling}
              currentPlan={(sub?.plan ?? "free") as Plan}
              hasStripeCustomer={Boolean(sub?.stripeCustomerId)}
              hasStripeSubscription={Boolean(sub?.stripeSubscriptionId)}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
