import { db } from "@/lib/db";
import { requireAdmin } from "@/app/admin/actions/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const params = (await searchParams) ?? {};
  const orgId = typeof params.orgId === "string" && params.orgId.length > 0 ? params.orgId : null;
  const daysRaw = typeof params.days === "string" ? params.days : "7";
  const days = daysRaw === "1" ? 1 : daysRaw === "30" ? 30 : 7;
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [orgs, logs, aiFailures, webhookIssues] = await Promise.all([
    db.organization.findMany({ orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } }),
    db.adminAuditLog.findMany({
      where: { createdAt: { gte: since }, ...(orgId ? { organizationId: orgId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        action: true,
        createdAt: true,
        organization: { select: { name: true } },
        actor: { select: { email: true } },
      },
    }),
    db.aiExtraction.findMany({
      where: { createdAt: { gte: since }, status: "failed", ...(orgId ? { organizationId: orgId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        kind: true,
        model: true,
        error: true,
        organization: { select: { name: true } },
      },
    }),
    db.stripeWebhookEvent.findMany({
      where: { createdAt: { gte: since }, outcome: { not: "processed" }, ...(orgId ? { organizationId: orgId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, type: true, outcome: true, note: true, createdAt: true, organizationId: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xl font-semibold tracking-tight text-foreground">Logs</div>
        <div className="text-sm text-muted-foreground">Auditoria e falhas recentes. Filtros por organização e período.</div>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/20 px-4 py-3 backdrop-blur">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" action="/admin/logs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              name="orgId"
              defaultValue={orgId ?? ""}
              className="h-9 rounded-xl border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Todas as organizações</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <select
              name="days"
              defaultValue={String(days)}
              className="h-9 rounded-xl border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="1">Últimas 24h</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
            <button className="h-9 rounded-xl border border-input bg-background/10 px-4 text-sm text-foreground hover:bg-muted/40" type="submit">
              Aplicar
            </button>
          </div>
          <div className="text-xs text-muted-foreground">
            Exibindo dados desde <span className="font-mono">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(since)}</span>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">AdminAuditLog</div>
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/30 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-border/50">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Ação</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Usuário</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Organização</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{l.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.actor?.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.organization.name}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(l.createdAt)}</td>
                  </tr>
                ))}
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Nenhum log encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">Falhas de IA</div>
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/30 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-border/50">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Organização</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Kind</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Modelo</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Erro</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {aiFailures.map((f) => (
                  <tr key={f.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{f.organization.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{f.kind}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.model ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.error ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(f.createdAt)}</td>
                  </tr>
                ))}
                {aiFailures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma falha de IA no período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">Falhas de webhook Stripe</div>
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/30 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-border/50">
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Outcome</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Org</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Nota</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {webhookIssues.map((w) => (
                  <tr key={w.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{w.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.outcome}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{w.organizationId ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(w.createdAt)}</td>
                  </tr>
                ))}
                {webhookIssues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Nenhuma falha de webhook no período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
