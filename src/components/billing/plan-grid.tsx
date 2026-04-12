"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { CheckIcon, XIcon, Loader2 } from "lucide-react";

type Plan = "free" | "basic" | "pro" | "starter" | "enterprise";

export function PlanGrid({
  canManageBilling,
  currentPlan,
  hasStripeCustomer,
  hasStripeSubscription,
  isCanceling,
  cancelingEndsAt,
}: {
  canManageBilling: boolean;
  currentPlan: Plan;
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
  isCanceling: boolean;
  cancelingEndsAt: string | null;
}) {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<string | null>(null);
  const planEffective: Plan = currentPlan === "starter" ? "basic" : currentPlan;
  const hasPortal = hasStripeSubscription && hasStripeCustomer;
  const cancelingMsg = isCanceling ? t("billing.freeDowngradeScheduled", { date: cancelingEndsAt ?? t("common.emDash") }) : null;

  async function startCheckout(plan: "basic" | "pro") {
    try {
      setMsg(null);
      setLoading(`checkout-${plan}`);
      const res = await fetch(`/api/stripe/checkout?plan=${plan}`, { method: "POST" });
      const data = await res.json();
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout error:", err);
      alert(t("billing.checkoutError"));
      setLoading(null);
    }
  }

  async function openPortal(source: string) {
    try {
      setMsg(null);
      setLoading(`portal-${source}`);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data?.error === "no_customer") {
        setMsg(t("billing.noActiveSubscription"));
        setLoading(null);
        return;
      }
      if (!data?.url) throw new Error("No portal URL returned");
      window.location.href = data.url;
    } catch (err) {
      console.error("Portal error:", err);
      setMsg(t("billing.portalError"));
      setLoading(null);
    }
  }

  async function startFree() {
    try {
      setMsg(null);
      setLoading("free");
      const res = await fetch("/api/billing/free", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.code === "active_subscription") {
          alert(t("billing.cannotDowngradeWithActiveSubscription"));
          setLoading(null);
          return;
        }
        throw new Error("Free plan failed");
      }
      window.location.href = "/billing";
    } catch (err) {
      console.error("Free plan error:", err);
      alert(t("auth.unexpected"));
      setLoading(null);
    }
  }

  const isCurrent = (plan: Plan) => planEffective === plan;
  return (
    <div className="space-y-6">
      {msg ? <div className="rounded-2xl border bg-card/30 px-4 py-3 text-sm text-muted-foreground">{msg}</div> : null}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-3xl border-white/10 bg-card/25 backdrop-blur transition duration-200 hover:scale-[1.02] hover:bg-card/35">
          <CardHeader className="space-y-2 pb-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.free")}</div>
              {isCurrent("free") ? <Badge variant="secondary">{t("billing.planCurrent")}</Badge> : null}
            </div>
            <div className="text-3xl font-semibold tracking-tight text-foreground">{t("billing.priceFree")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.freeDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Controle básico de receitas e despesas</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Painel financeiro simples</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XIcon className="mt-0.5 size-4 text-rose-500" />
                <span>Relatórios avançados</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XIcon className="mt-0.5 size-4 text-rose-500" />
                <span>Integração WhatsApp</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <XIcon className="mt-0.5 size-4 text-rose-500" />
                <span>Inteligência artificial</span>
              </li>
            </ul>
            {cancelingMsg ? (
              <div className="rounded-2xl border bg-card/30 px-4 py-3 text-sm text-muted-foreground">{cancelingMsg}</div>
            ) : null}
            <Button
              className="h-11 w-full rounded-2xl"
              variant="outline"
              disabled={!canManageBilling || isCurrent("free") || loading !== null || isCanceling}
              onClick={() => {
                if (!canManageBilling) return;
                if (hasStripeSubscription) {
                  alert(t("billing.cannotDowngradeWithActiveSubscription"));
                  return;
                }
                startFree();
              }}
            >
              {loading === "free" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isCurrent("free") ? t("billing.currentPlanCta") : t("billing.startFree")}
            </Button>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-3xl border-strategy-neon/40 bg-card/30 backdrop-blur ring-1 ring-strategy-neon/50 shadow-[0_0_30px_rgba(0,255,102,0.15)] transition duration-200 before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-[linear-gradient(to_bottom,rgba(0,255,102,0.08),transparent)] hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(0,255,102,0.25)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-strategy-neon/40 to-transparent" />
          <CardHeader className="space-y-2 pb-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.basic")}</div>
              <Badge className="bg-strategy-neon/20 text-strategy-neon hover:bg-strategy-neon/30 border-strategy-neon/30">{t("billing.planRecommended")}</Badge>
            </div>
            <div className="text-3xl font-semibold tracking-tight text-foreground">{t("billing.priceBasic")}</div>
            <div className="text-xs text-muted-foreground">{t("billing.basicPriceNote")}</div>
            <div className="hidden text-xs text-muted-foreground sm:block">{t("billing.basicSocialProof")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.basicDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Tudo do gratuito</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Relatórios financeiros detalhados</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Organização por categorias</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Controle completo de entradas e saídas</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>WhatsApp da plataforma (número central)</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>IA para interpretar mensagens (20/mês)</span>
              </li>
            </ul>
            <div className="text-xs text-muted-foreground">{t("billing.basicMicrocopy")}</div>
            {hasPortal ? (
              isCurrent("basic") ? (
                <Button className="h-11 w-full rounded-2xl" variant="secondary" disabled>
                  {t("billing.currentPlanCta")}
                </Button>
              ) : planEffective === "pro" ? (
                <Button className="h-11 w-full rounded-2xl" variant="outline" disabled>
                  {t("billing.alreadyOnPro")}
                </Button>
              ) : (
                <Button className="h-11 w-full rounded-2xl bg-strategy-neon text-black hover:bg-strategy-neon/90" onClick={() => openPortal("basic")} disabled={!canManageBilling || loading !== null}>
                  {loading === "portal-basic" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("billing.subscribeBasic")}
                </Button>
              )
            ) : (
              <Button className="h-11 w-full rounded-2xl bg-strategy-neon text-black hover:bg-strategy-neon/90" disabled={!canManageBilling || loading !== null} onClick={() => startCheckout("basic")}>
                {loading === "checkout-basic" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("billing.subscribeBasic")}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/10 bg-card/25 backdrop-blur transition duration-200 hover:scale-[1.02] hover:bg-card/35">
          <CardHeader className="space-y-2 pb-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{t("subscription.plan.pro")}</div>
              {isCurrent("pro") ? <Badge variant="secondary">{t("billing.planCurrent")}</Badge> : null}
            </div>
            <div className="text-3xl font-semibold tracking-tight text-foreground">{t("billing.pricePro")}</div>
            <div className="text-xs text-muted-foreground">{t("billing.proPriceNote")}</div>
            <div className="text-sm text-muted-foreground">{t("billing.proDescription")}</div>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Tudo do básico</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Conecte seu próprio WhatsApp</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Automação de lançamentos</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Inteligência artificial para insights</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckIcon className="mt-0.5 size-4 text-strategy-neon" />
                <span>Economia de tempo com automações</span>
              </li>
            </ul>
            <div className="text-xs text-muted-foreground">{t("billing.proMicrocopy")}</div>
            {hasPortal ? (
              isCurrent("pro") ? (
                <Button className="h-11 w-full rounded-2xl" variant="secondary" disabled>
                  {t("billing.currentPlanCta")}
                </Button>
              ) : planEffective === "basic" ? (
                <Button className="h-11 w-full rounded-2xl" variant="outline" onClick={() => openPortal("pro")} disabled={!canManageBilling || loading !== null}>
                  {loading === "portal-pro" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t("billing.subscribePro")}
                </Button>
              ) : (
                <Button className="h-11 w-full rounded-2xl" variant="outline" disabled>
                  {t("billing.alreadyOnPro")}
                </Button>
              )
            ) : (
              <Button className="h-11 w-full rounded-2xl" variant="outline" disabled={!canManageBilling || loading !== null} onClick={() => startCheckout("pro")}>
                {loading === "checkout-pro" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("billing.subscribePro")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
