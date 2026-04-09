"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { CheckIcon, XIcon } from "lucide-react";

type Plan = "free" | "basic" | "pro" | "starter" | "enterprise";

export function PlanGrid({
  canManageBilling,
  currentPlan,
  hasStripeCustomer,
  hasStripeSubscription,
}: {
  canManageBilling: boolean;
  currentPlan: Plan;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
}) {
  const [msg, setMsg] = React.useState<string | null>(null);
  const planEffective: Plan = currentPlan === "starter" ? "basic" : currentPlan;
  const hasPortal = hasStripeSubscription && hasStripeCustomer;

  async function startCheckout(plan: "basic" | "pro") {
    try {
      setMsg(null);
      const res = await fetch(`/api/stripe/checkout?plan=${plan}`, { method: "POST" });
      const data = await res.json();
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      alert(t("billing.checkoutError"));
    }
  }

  async function openPortal() {
    try {
      setMsg(null);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data?.error === "no_customer") {
        setMsg(t("billing.noActiveSubscription"));
        return;
      }
      if (!data?.url) throw new Error("No portal URL returned");
      window.location.href = data.url;
    } catch (err) {
      console.error("Portal error:", err);
      setMsg(t("billing.portalError"));
    }
  }

  async function startFree() {
    try {
      setMsg(null);
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

  const isCurrent = (plan: Plan) => planEffective === plan;
  return (
    <div className="space-y-4">
      {msg ? <div className="rounded-xl border bg-card/30 px-3 py-2 text-sm text-muted-foreground">{msg}</div> : null}
      <div className="text-center">
        <div className="text-base font-semibold text-foreground">{t("billing.choosePlanTitle")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("billing.choosePlanSubtitle")}</div>
        <div className="mt-2 text-xs text-muted-foreground">{t("billing.choosePlanNote")}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-white/10 bg-card/25 backdrop-blur transition-colors hover:bg-card/35">
          <CardHeader className="space-y-2 pb-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.free")}</div>
              {isCurrent("free") ? <Badge variant="secondary">{t("billing.planCurrent")}</Badge> : null}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{t("billing.priceFree")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.freeDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>{t("billing.freeBullet1")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>{t("billing.freeBullet2")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XIcon className="mt-0.5 size-4 text-muted-foreground/60" />
                <span>Relatórios avançados</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XIcon className="mt-0.5 size-4 text-muted-foreground/60" />
                <span>Integração WhatsApp</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XIcon className="mt-0.5 size-4 text-muted-foreground/60" />
                <span>Inteligência artificial</span>
              </li>
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
              {isCurrent("free") ? t("billing.currentPlanCta") : t("billing.startFree")}
            </Button>
          </CardContent>
        </Card>

        <Card className="relative border-white/10 bg-card/25 backdrop-blur ring-1 ring-primary/25 transition-colors hover:bg-card/35">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <CardHeader className="space-y-2 pb-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.basic")}</div>
              <Badge variant="secondary">{t("billing.planRecommended")}</Badge>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{t("billing.priceBasic")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.basicDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>Tudo do gratuito</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>{t("billing.basicBullet2")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>{t("billing.basicBullet3")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>{t("billing.basicBullet1")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XIcon className="mt-0.5 size-4 text-muted-foreground/60" />
                <span>WhatsApp</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XIcon className="mt-0.5 size-4 text-muted-foreground/60" />
                <span>Inteligência artificial</span>
              </li>
            </ul>
            <div className="text-xs text-muted-foreground">{t("billing.basicMicrocopy")}</div>
            {hasPortal ? (
              isCurrent("basic") ? (
                <Button className="h-11 w-full rounded-xl" variant="secondary" disabled>
                  {t("billing.currentPlanCta")}
                </Button>
              ) : planEffective === "pro" ? (
                <Button className="h-11 w-full rounded-xl" variant="outline" disabled>
                  {t("billing.alreadyOnPro")}
                </Button>
              ) : (
                <Button className="h-11 w-full rounded-xl" onClick={openPortal}>
                  {t("billing.upgrade")}
                </Button>
              )
            ) : (
              <Button className="h-11 w-full rounded-xl" disabled={!canManageBilling} onClick={() => startCheckout("basic")}>
                {t("billing.subscribeBasic")}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/25 backdrop-blur transition-colors hover:bg-card/35">
          <CardHeader className="space-y-2 pb-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.pro")}</div>
              {isCurrent("pro") ? <Badge variant="secondary">{t("billing.planCurrent")}</Badge> : null}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{t("billing.pricePro")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.proDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>Tudo do básico</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>{t("billing.proBullet2")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>{t("billing.proBullet3")}</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-emerald-400" />
                <span>{t("billing.proBullet4")}</span>
              </li>
            </ul>
            <div className="text-xs text-muted-foreground">{t("billing.proMicrocopy")}</div>
            {hasPortal ? (
              isCurrent("pro") ? (
                <Button className="h-11 w-full rounded-xl" variant="secondary" disabled>
                  {t("billing.currentPlanCta")}
                </Button>
              ) : planEffective === "basic" ? (
                <Button className="h-11 w-full rounded-xl" onClick={openPortal}>
                  {t("billing.upgrade")}
                </Button>
              ) : (
                <Button className="h-11 w-full rounded-xl" variant="outline" disabled>
                  {t("billing.alreadyOnPro")}
                </Button>
              )
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
