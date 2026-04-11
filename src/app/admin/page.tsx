import { requireAdmin } from "@/app/admin/actions/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
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

export default async function AdminDashboardPage() {
  await requireAdmin();

  const now = new Date();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeSessionsUsers,
    totalOrgs,
    subscriptions,
    whatsappMessages,
    drafts,
    aiRuns,
    aiErrors,
    whatsappConnected,
    openAiEnabledOrgs,
    recentSessions,
    recentMessages,
    recentAiFailures,
  ] = await Promise.all([
    db.user.count(),
    db.session.findMany({
      where: { expiresAt: { gt: now }, createdAt: { gt: last30d } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    db.organization.count(),
    db.subscription.findMany({ select: { plan: true } }),
    db.whatsappMessage.count(),
    db.smartDraft.count(),
    db.aiExtraction.count(),
    db.aiExtraction.count({ where: { status: "failed" } }),
    db.integrationConnection.count({ where: { type: "whatsapp", status: "active" } }),
    db.organizationFeatureConfig.count({ where: { openAiEnabled: true } }),
    db.session.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { createdAt: true, organization: { select: { id: true, name: true } } },
    }),
    db.whatsappMessage.findMany({
      where: { processedAt: { not: null } },
      orderBy: { processedAt: "desc" },
      take: 10,
      select: {
        processedAt: true,
        receivedAt: true,
        messageType: true,
        fromNumber: true,
        organization: { select: { name: true } },
      },
    }),
    db.aiExtraction.findMany({
      where: { status: "failed" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        createdAt: true,
        kind: true,
        model: true,
        error: true,
        organization: { select: { name: true } },
      },
    }),
  ]);

  const basicCount = subscriptions.filter((s) => s.plan === "basic" || s.plan === "starter").length;
  const proCount = subscriptions.filter((s) => s.plan === "pro").length;
  const freeCount = Math.max(0, totalOrgs - basicCount - proCount);

  const seen = new Set<string>();
  const recentOrgs = recentSessions
    .filter((s) => {
      if (seen.has(s.organization.id)) return false;
      seen.add(s.organization.id);
      return true;
    })
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xl font-semibold tracking-tight text-foreground">Dashboard</div>
        <div className="text-sm text-muted-foreground">Visão geral do sistema e principais contadores.</div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total de usuários" value={String(totalUsers)} />
        <StatCard title="Usuários ativos" value={String(activeSessionsUsers.length)} hint="Com sessão ativa nos últimos 30 dias" />
        <StatCard title="Organizações" value={String(totalOrgs)} />
        <StatCard title="Orgs Free" value={String(freeCount)} />
        <StatCard title="Orgs Basic" value={String(basicCount)} />
        <StatCard title="Orgs Pro" value={String(proCount)} />
        <StatCard title="Mensagens WhatsApp" value={String(whatsappMessages)} />
        <StatCard title="Drafts criados" value={String(drafts)} />
        <StatCard title="Execuções de IA" value={String(aiRuns)} />
        <StatCard title="Erros de IA" value={String(aiErrors)} />
        <StatCard title="WhatsApp conectados" value={String(whatsappConnected)} />
        <StatCard title="OpenAI ativa" value={String(openAiEnabledOrgs)} hint="Via feature flag" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/30 backdrop-blur lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimas organizações ativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentOrgs.map((s) => (
              <div key={s.organization.id} className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/10 px-4 py-3">
                <div className="truncate text-foreground">{s.organization.name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(s.createdAt)}
                </div>
              </div>
            ))}
            {recentOrgs.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma atividade recente.</div> : null}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimas mensagens processadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentMessages.map((m, idx) => (
              <div key={idx} className="rounded-2xl border border-border/50 bg-background/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="truncate text-foreground">{m.organization.name}</div>
                  <div className="text-xs text-muted-foreground">{m.messageType}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {m.fromNumber ?? "—"} •{" "}
                  {m.processedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(m.processedAt) : "—"}
                </div>
              </div>
            ))}
            {recentMessages.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma mensagem.</div> : null}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimos erros relevantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentAiFailures.map((e, idx) => (
              <div key={idx} className="rounded-2xl border border-border/50 bg-background/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="truncate text-foreground">{e.organization.name}</div>
                  <div className="text-xs text-muted-foreground">{e.kind}</div>
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.error ?? "—"}</div>
              </div>
            ))}
            {recentAiFailures.length === 0 ? <div className="text-sm text-muted-foreground">Nenhum erro recente.</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
