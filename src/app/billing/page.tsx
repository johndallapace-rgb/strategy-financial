import { requireAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { ManageSubscriptionCta } from "@/components/billing/manage-subscription-cta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlanGrid } from "@/components/billing/plan-grid";
import { t, type I18nKey } from "@/lib/i18n";
import { CheckIcon, ShieldCheckIcon } from "lucide-react";

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
      cancelAtPeriodEnd: true,
    },
  });

  const canManageBilling = auth.role === "owner" || auth.role === "admin";
  const hasStripe = Boolean(sub?.stripeCustomerId);
  const hasPortal = Boolean(sub?.stripeCustomerId && sub?.stripeSubscriptionId);
  const isActive = sub?.status === "active" || sub?.status === "trialing";
  const isPastDue = sub?.status === "past_due";
  const isCanceling = isActive && sub?.cancelAtPeriodEnd;
  const showCheckoutSuccess = checkout === "success";
  const showCheckoutCanceled = checkout === "cancel";
  const showPortalReturn = portal === "success";

  const tKey = (key: string) => t(key as I18nKey);
  const planLabel = sub?.plan ? tKey(`subscription.plan.${sub.plan}`) : t("common.emDash");
  
  let statusLabel = sub?.status ? tKey(`subscription.status.${sub.status}`) : t("common.emDash");
  if (isCanceling) {
    statusLabel = tKey("subscription.status.active_canceling");
  }

  const cycleLabel = sub?.billingCycle ? tKey(`subscription.cycle.${sub.billingCycle}`) : t("common.emDash");

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formattedEndDate = sub?.currentPeriodEnd ? dateFormatter.format(sub.currentPeriodEnd) : null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-screen-lg space-y-10">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{t("billing.heroTitle")}</h1>
              <div className="text-base text-muted-foreground">{t("billing.heroSubtitle")}</div>
              <div className="text-sm text-muted-foreground">{t("billing.socialProof")}</div>
            </div>
            {!canManageBilling ? (
              <Button className="h-10 rounded-2xl" variant="outline" disabled>
                {t("billing.onlyOwnerAdmin")}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <CheckIcon className="size-4 text-strategy-neon" />
              <span>{t("billing.valueBullet1")}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <CheckIcon className="size-4 text-strategy-neon" />
              <span>{t("billing.valueBullet2")}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <CheckIcon className="size-4 text-strategy-neon" />
              <span>{t("billing.valueBullet3")}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-4">
            {showCheckoutSuccess ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {t("billing.checkoutSuccess")}
              </div>
            ) : null}
            {showCheckoutCanceled ? (
              <div className="rounded-2xl border bg-card/40 px-4 py-3 text-sm text-muted-foreground">{t("billing.checkoutCanceled")}</div>
            ) : null}
            {showPortalReturn ? (
              <div className="rounded-2xl border border-strategy-neon/25 bg-strategy-neon/5 px-4 py-3 text-sm text-foreground">
                {t("billing.portalReturn")}
              </div>
            ) : null}
            {isPastDue ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{t("billing.pastDue")}</div>
            ) : null}

            <Card className="rounded-3xl border-white/10 bg-card/30 shadow-[0_18px_55px_rgba(0,0,0,0.40)] backdrop-blur">
              <CardHeader className="space-y-1.5 pb-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("nav.billing")}</CardTitle>
                <div className="text-2xl font-semibold tracking-tight text-foreground">{planLabel}</div>
                <div className="text-sm text-muted-foreground">
                  {statusLabel}
                  <span className="mx-2 text-muted-foreground/60">•</span>
                  {cycleLabel}
                </div>
                {isCanceling && formattedEndDate ? (
                  <div className="text-sm text-muted-foreground">
                    {t("billing.accessUntil")} <span className="font-medium text-foreground">{formattedEndDate}</span>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                {isCanceling ? (
                  <div className="rounded-2xl border border-strategy-neon/20 bg-strategy-neon/5 px-4 py-3">
                    <div className="text-sm font-semibold text-foreground">{t("billing.cancelingTitle")}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t("billing.cancelingBody")}</div>
                    {hasPortal && canManageBilling ? (
                      <div className="mt-3">
                        <ManageSubscriptionCta className="h-11 w-full rounded-2xl bg-strategy-neon/10 text-strategy-neon hover:bg-strategy-neon/20" label={t("billing.reactivatePlan")} />
                        <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                          <ShieldCheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                          <span>{t("billing.portalPreflight")}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="text-sm text-muted-foreground">
                  {hasStripe
                    ? isCanceling
                      ? t("billing.manageHintCanceling")
                      : t("billing.manageHint")
                    : isActive
                      ? t("billing.accessTemporarilyOk")
                      : t("billing.inactiveHint")}
                </div>

                {hasPortal && !isCanceling ? (
                  <div className="space-y-2">
                    <ManageSubscriptionCta className="h-11 w-full rounded-2xl" label={t("billing.manageSubscription")} />
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ShieldCheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                      <span>{t("billing.portalPreflight")}</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            {showCheckoutSuccess ? <div className="sr-only">{t("billing.checkoutSuccess")}</div> : null}
            <PlanGrid
              canManageBilling={canManageBilling}
              currentPlan={(sub?.plan ?? "free") as Plan}
              hasStripeCustomer={Boolean(sub?.stripeCustomerId)}
              hasStripeSubscription={Boolean(sub?.stripeSubscriptionId)}
              isCanceling={Boolean(isCanceling)}
              cancelingEndsAt={formattedEndDate}
            />
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">{t("billing.noCommitment")}</div>
      </div>
    </AppShell>
  );
}
