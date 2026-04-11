import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/app/admin/actions/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAiPage() {
  await requireAdmin();

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalRuns, runs24h, enabledOrgs, cost24h, cost7d, cost30d, topCostOrgs] = await Promise.all([
    db.aiExtraction.count(),
    db.aiExtraction.count({ where: { createdAt: { gt: last24h } } }),
    db.organizationFeatureConfig.count({ where: { openAiEnabled: true } }),
    db.aiExtraction.aggregate({ where: { createdAt: { gt: last24h } }, _sum: { costCents: true } }),
    db.aiExtraction.aggregate({ where: { createdAt: { gt: last7d } }, _sum: { costCents: true } }),
    db.aiExtraction.aggregate({ where: { createdAt: { gt: last30d } }, _sum: { costCents: true } }),
    db.aiExtraction.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gt: last30d } },
      _sum: { costCents: true },
      orderBy: { _sum: { costCents: "desc" } },
      take: 10,
    }),
  ]);

  const model = process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini";
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const orgNames = await db.organization.findMany({
    where: { id: { in: topCostOrgs.map((o) => o.organizationId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(orgNames.map((o) => [o.id, o.name]));
  const fmtUsd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xl font-semibold tracking-tight text-foreground">IA / OpenAI</div>
        <div className="text-sm text-muted-foreground">Status e métricas de execução.</div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chave configurada</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tracking-tight text-foreground">{hasKey ? "Sim" : "Não"}</CardContent>
        </Card>
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modelo</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xs text-foreground">{model}</CardContent>
        </Card>
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Execuções (total)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tracking-tight text-foreground">{String(totalRuns)}</CardContent>
        </Card>
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Execuções (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tracking-tight text-foreground">{String(runs24h)}</CardContent>
        </Card>
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo (24h)</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xs text-foreground">{fmtUsd(cost24h._sum.costCents ?? 0)}</CardContent>
        </Card>
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo (7d)</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xs text-foreground">{fmtUsd(cost7d._sum.costCents ?? 0)}</CardContent>
        </Card>
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo (30d)</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xs text-foreground">{fmtUsd(cost30d._sum.costCents ?? 0)}</CardContent>
        </Card>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/30 p-5 text-sm text-muted-foreground backdrop-blur">
        Organizações com OpenAI habilitado via feature flag: <span className="font-medium text-foreground">{enabledOrgs}</span>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur">
        <div className="border-b border-border/50 px-5 py-4">
          <div className="text-sm font-medium text-foreground">Top custo (30d)</div>
          <div className="text-xs text-muted-foreground">Estimativa baseada em tokens, quando disponível.</div>
        </div>
        <div className="p-5">
          <div className="grid gap-2">
            {topCostOrgs.map((o) => (
              <div key={o.organizationId} className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/10 px-4 py-3 text-sm">
                <div className="truncate text-muted-foreground">{nameById.get(o.organizationId) ?? o.organizationId}</div>
                <div className="font-mono text-xs text-foreground">{fmtUsd(o._sum.costCents ?? 0)}</div>
              </div>
            ))}
            {topCostOrgs.length === 0 ? <div className="text-sm text-muted-foreground">Sem dados de custo no período.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
