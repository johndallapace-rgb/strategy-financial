import { db } from "@/lib/db";
import { requireAdmin } from "@/app/admin/actions/auth";
import { getPlanLimits } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatUsdCents(costCents: number) {
  const v = costCents / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default async function AdminUsagePage() {
  await requireAdmin();

  const now = new Date();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const orgs = await db.organization.findMany({
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true },
  });

  const orgIds = orgs.map((o) => o.id);

  const [subs, wa30d, drafts30d, ai30d, aiErrors30d, ai7d, ai24h] = await Promise.all([
    db.subscription.findMany({
      where: { organizationId: { in: orgIds } },
      select: { organizationId: true, plan: true },
    }),
    db.whatsappMessage.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: orgIds }, receivedAt: { gte: last30d } },
      _count: { _all: true },
    }),
    db.smartDraft.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: orgIds }, createdAt: { gte: last30d } },
      _count: { _all: true },
    }),
    db.aiExtraction.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: orgIds }, createdAt: { gte: last30d } },
      _count: { _all: true },
      _sum: { costCents: true },
    }),
    db.aiExtraction.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: orgIds }, createdAt: { gte: last30d }, status: "failed" },
      _count: { _all: true },
    }),
    db.aiExtraction.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: orgIds }, createdAt: { gte: last7d } },
      _sum: { costCents: true },
    }),
    db.aiExtraction.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: orgIds }, createdAt: { gte: last24h } },
      _sum: { costCents: true },
    }),
  ]);

  const planByOrg = new Map(subs.map((s) => [s.organizationId, s.plan]));
  const waCount = new Map(wa30d.map((r) => [r.organizationId, r._count._all]));
  const draftCount = new Map(drafts30d.map((r) => [r.organizationId, r._count._all]));
  const aiCount = new Map(ai30d.map((r) => [r.organizationId, r._count._all]));
  const aiCost30 = new Map(ai30d.map((r) => [r.organizationId, r._sum.costCents ?? 0]));
  const aiErrors = new Map(aiErrors30d.map((r) => [r.organizationId, r._count._all]));
  const aiCost7 = new Map(ai7d.map((r) => [r.organizationId, r._sum.costCents ?? 0]));
  const aiCost24 = new Map(ai24h.map((r) => [r.organizationId, r._sum.costCents ?? 0]));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xl font-semibold tracking-tight text-foreground">Uso</div>
        <div className="text-sm text-muted-foreground">Métricas reais por organização (30d) e custo estimado de IA.</div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/30 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-border/50">
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Organização</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Plano</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">WhatsApp (30d)</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Drafts (30d)</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">IA runs (30d)</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Erros IA (30d)</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Custo IA (24h)</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Custo IA (7d)</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Custo IA (30d)</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {orgs.map((o) => {
                const plan = planByOrg.get(o.id) ?? "free";
                const limits = getPlanLimits(plan);
                const w = waCount.get(o.id) ?? 0;
                const d = draftCount.get(o.id) ?? 0;
                const a = aiCount.get(o.id) ?? 0;
                const e = aiErrors.get(o.id) ?? 0;
                const wHot = limits.whatsappMessagesPerMonth > 0 && w / limits.whatsappMessagesPerMonth >= 0.8;
                const aHot = limits.aiRunsPerMonth > 0 && a / limits.aiRunsPerMonth >= 0.8;
                const dHot = limits.draftsPerMonth > 0 && d / limits.draftsPerMonth >= 0.8;
                return (
                  <tr key={o.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-foreground">{o.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{plan}</td>
                    <td className={["px-4 py-3 text-right", wHot ? "text-rose-300" : "text-muted-foreground"].join(" ")}>
                      {w} / {limits.whatsappMessagesPerMonth}
                    </td>
                    <td className={["px-4 py-3 text-right", dHot ? "text-rose-300" : "text-muted-foreground"].join(" ")}>
                      {d} / {limits.draftsPerMonth}
                    </td>
                    <td className={["px-4 py-3 text-right", aHot ? "text-rose-300" : "text-muted-foreground"].join(" ")}>
                      {a} / {limits.aiRunsPerMonth}
                    </td>
                    <td className={["px-4 py-3 text-right", e > 0 ? "text-rose-300" : "text-muted-foreground"].join(" ")}>
                      {e}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{formatUsdCents(aiCost24.get(o.id) ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{formatUsdCents(aiCost7.get(o.id) ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{formatUsdCents(aiCost30.get(o.id) ?? 0)}</td>
                  </tr>
                );
              })}
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhuma organização encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

