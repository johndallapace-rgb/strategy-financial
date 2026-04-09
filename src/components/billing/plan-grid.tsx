"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PortalButton } from "@/components/billing/portal-button";
import { t } from "@/lib/i18n";

type Plan = "free" | "basic" | "pro" | "starter" | "enterprise";

export function PlanGrid({
  canManageBilling,
  currentPlan,
  hasStripeSubscription,
}: {
  canManageBilling: boolean;
  currentPlan: Plan;
  hasStripeSubscription: boolean;
}) {
  async function startCheckout(plan: "basic" | "pro") {
    try {
      const res = await fetch(`/api/stripe/checkout?plan=${plan}`, { method: "POST" });
      const data = await res.json();
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      alert(t("billing.checkoutError"));
    }
  }

  async function startFree() {
    try {
      const res = await fetch("/api/billing/free", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.code === "active_subscription") {
          alert(t("billing.cannotDowngradeWithActiveSubscription"));
          return;
        }
        throw new Error("Free plan failed");
      }
      window.location.href = "/billing";
    } catch (err) {
      console.error("Free plan error:", err);
      alert(t("auth.unexpected"));
    }
  }

  const isCurrent = (plan: Plan) => currentPlan === plan || (plan === "basic" && currentPlan === "starter");
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-base font-semibold text-foreground">{t("billing.choosePlanTitle")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("billing.choosePlanSubtitle")}</div>
        <div className="mt-2 text-xs text-muted-foreground">{t("billing.choosePlanNote")}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-white/10 bg-card/35 backdrop-blur">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.free")}</div>
              {isCurrent("free") ? <Badge variant="secondary">{t("billing.planCurrent")}</Badge> : null}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{t("billing.priceFree")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.freeDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("billing.freeBullet1")}</li>
              <li>{t("billing.freeBullet2")}</li>
              <li>{t("billing.freeBullet3")}</li>
            </ul>
            <Button
              className="h-11 w-full rounded-xl"
              variant="outline"
              disabled={!canManageBilling || isCurrent("free")}
              onClick={() => {
                if (!canManageBilling) return;
                if (hasStripeSubscription) {
                  alert(t("billing.cannotDowngradeWithActiveSubscription"));
                  return;
                }
                startFree();
              }}
            >
              {isCurrent("free") ? t("billing.planCurrent") : t("billing.startFree")}
            </Button>
          </CardContent>
        </Card>

        <Card className="relative border-white/10 bg-card/35 backdrop-blur ring-1 ring-primary/25">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.basic")}</div>
              <Badge variant="secondary">{t("billing.planRecommended")}</Badge>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{t("billing.priceBasic")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.basicDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("billing.basicBullet1")}</li>
              <li>{t("billing.basicBullet2")}</li>
              <li>{t("billing.basicBullet3")}</li>
              <li>{t("billing.basicBullet4")}</li>
            </ul>
            <div className="text-xs text-muted-foreground">{t("billing.basicMicrocopy")}</div>
            {hasStripeSubscription ? (
              <PortalButton className="h-11 w-full rounded-xl" />
            ) : (
              <Button className="h-11 w-full rounded-xl" disabled={!canManageBilling} onClick={() => startCheckout("basic")}>
                {t("billing.subscribeBasic")}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/35 backdrop-blur">
          <CardHeader className="space-y-2 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.pro")}</div>
              {isCurrent("pro") ? <Badge variant="secondary">{t("billing.planCurrent")}</Badge> : null}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{t("billing.pricePro")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.proDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("billing.proBullet1")}</li>
              <li>{t("billing.proBullet2")}</li>
              <li>{t("billing.proBullet3")}</li>
              <li>{t("billing.proBullet4")}</li>
            </ul>
            <div className="text-xs text-muted-foreground">{t("billing.proMicrocopy")}</div>
            {hasStripeSubscription ? (
              <PortalButton className="h-11 w-full rounded-xl" />
            ) : (
              <Button className="h-11 w-full rounded-xl" disabled={!canManageBilling} onClick={() => startCheckout("pro")}>
                {t("billing.subscribePro")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
