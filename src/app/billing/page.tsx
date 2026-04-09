import Link from "next/link";
import { requireAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuthBrandHeader } from "@/components/auth-brand-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { PortalButton } from "@/components/billing/portal-button";
import { t, type I18nKey } from "@/lib/i18n";

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
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_circle_at_18%_12%,rgba(37,99,235,0.20),transparent_55%),radial-gradient(900px_circle_at_82%_10%,rgba(139,92,246,0.18),transparent_52%),radial-gradient(1100px_circle_at_50%_100%,rgba(16,185,129,0.10),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05071a] via-[#06081c] to-[#020316] opacity-80" />

      <div className="relative mx-auto flex min-h-dvh max-w-screen-sm items-center px-4 py-10">
        <Card className="w-full rounded-2xl border border-white/10 bg-card/55 shadow-[0_18px_50px_rgba(0,0,0,0.50)] backdrop-blur-xl">
          <CardHeader className="space-y-6 pb-2 pt-8">
            <AuthBrandHeader />
            <CardTitle className="text-center text-[22px] font-semibold tracking-tight">{t("billing.requiredTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pb-7 pt-0">
            {showCheckoutSuccess ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{t("billing.checkoutSuccess")}</div>
            ) : null}
            {showCheckoutCanceled ? (
              <div className="rounded-xl border bg-card/50 px-3 py-2 text-sm text-muted-foreground">{t("billing.checkoutCanceled")}</div>
            ) : null}
            {showPortalReturn ? (
              <div className="rounded-xl border bg-card/50 px-3 py-2 text-sm text-muted-foreground">{t("billing.portalReturn")}</div>
            ) : null}
            {isPastDue ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{t("billing.pastDue")}</div>
            ) : null}

            <div className="rounded-2xl border bg-background/20 p-4 text-sm">
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

            <div className="grid gap-2">
              {canManageBilling ? (
                hasStripe ? (
                  <PortalButton className="h-11 w-full rounded-xl" />
                ) : (
                  <CheckoutButton className="h-11 w-full rounded-xl" />
                )
              ) : (
                <Button className="h-11 w-full rounded-xl" disabled>
                  {t("billing.onlyOwnerAdmin")}
                </Button>
              )}
              <Link
                href="/settings"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
              >
                Ver equipe e configurações
              </Link>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Acesso permitido normalmente para empresas com status active ou trialing.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
