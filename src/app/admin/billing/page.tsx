import { db } from "@/lib/db";
import { requireAdmin } from "@/app/admin/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Stat({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card className="border-border/50 bg-card/30 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminBillingPage() {
  await requireAdmin();

  const totalOrgs = await db.organization.count();
  const subs = await db.subscription.findMany({
    select: {
      organizationId: true,
      plan: true,
      status: true,
      billingCycle: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: true,
      organization: { select: { name: true } },
    },
  });

  const basicCount = subs.filter((s) => s.plan === "basic" || s.plan === "starter").length;
  const proCount = subs.filter((s) => s.plan === "pro").length;
  const freeCount = Math.max(0, totalOrgs - basicCount - proCount);

  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trialing");
  const canceling = activeSubs.filter((s) => s.cancelAtPeriodEnd);
  const canceled = subs.filter((s) => s.status === "canceled");

  const freeAfterDowngrade = subs.filter(
    (s) => s.plan === "free" && s.status === "active" && !s.stripeSubscriptionId && Boolean(s.stripeCustomerId)
  );
  const customerNoSub = subs.filter((s) => !s.stripeSubscriptionId && Boolean(s.stripeCustomerId));

  const expectedBasic = [process.env.STRIPE_PRICE_ID_BASIC, process.env.STRIPE_PRICE_ID_STARTER].filter(Boolean) as string[];
  const expectedPro = [process.env.STRIPE_PRICE_ID_PRO].filter(Boolean) as string[];

  const inconsistencies = subs
    .filter((s) => {
      if (!s.stripePriceId) return false;
      if (s.plan === "pro") return expectedPro.length > 0 && !expectedPro.includes(s.stripePriceId);
      if (s.plan === "basic" || s.plan === "starter") return expectedBasic.length > 0 && !expectedBasic.includes(s.stripePriceId);
      if (s.plan === "free") return Boolean(s.stripeSubscriptionId);
      return false;
    })
    .slice(0, 50);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xl font-semibold tracking-tight text-foreground">Billing</div>
        <div className="text-sm text-muted-foreground">Visão administrativa de planos, assinatura e possíveis inconsistências.</div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Organizações" value={String(totalOrgs)} />
        <Stat title="Free" value={String(freeCount)} />
        <Stat title="Basic" value={String(basicCount)} />
        <Stat title="Pro" value={String(proCount)} />
        <Stat title="Assinaturas ativas" value={String(activeSubs.length)} />
        <Stat title="Cancelamento agendado" value={String(canceling.length)} />
        <Stat title="Assinaturas canceladas" value={String(canceled.length)} />
        <Stat title="Customer sem assinatura" value={String(customerNoSub.length)} hint="stripeCustomerId sem stripeSubscriptionId" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelamentos agendados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {canceling.slice(0, 20).map((s) => (
              <div key={s.organizationId} className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/10 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-foreground">{s.organization.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.plan} • {s.billingCycle}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {s.currentPeriodEnd ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(s.currentPeriodEnd) : "—"}
                </div>
              </div>
            ))}
            {canceling.length === 0 ? <div className="text-sm text-muted-foreground">Nenhum cancelamento agendado.</div> : null}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inconsistências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {inconsistencies.map((s) => (
              <div key={s.organizationId} className="rounded-2xl border border-border/50 bg-background/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="truncate text-foreground">{s.organization.name}</div>
                  <div className="text-xs text-muted-foreground">{s.plan}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  stripePriceId: <span className="font-mono">{s.stripePriceId ?? "—"}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  stripeSubscriptionId: <span className="font-mono">{s.stripeSubscriptionId ?? "—"}</span>
                </div>
              </div>
            ))}
            {inconsistencies.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma inconsistência detectada.</div> : null}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/10 px-4 py-3 text-xs text-muted-foreground">
        Org em Free após downgrade automático (com customer Stripe): <span className="font-medium text-foreground">{freeAfterDowngrade.length}</span>
      </div>
    </div>
  );
}

