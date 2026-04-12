import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { AccountDialog } from "@/components/settings/account-dialog";
import { CostCenterDialog } from "@/components/settings/cost-center-dialog";
import { AlertsForm } from "@/components/settings/alerts-form";
import { RecurringRuleDialog } from "@/components/settings/recurring-rule-dialog";
import { TeamManagement } from "@/components/settings/team-management";
import { WhatsappIntegrationCard } from "@/components/settings/whatsapp-integration-card";
import { displayAccountName, displayCategoryName, displaySourceName } from "@/lib/ptbr";
import { t } from "@/lib/i18n";
import { seedDefaultFinanceForOrganization } from "@/lib/default-finance";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const auth = await requireAuthContext();
  await seedDefaultFinanceForOrganization(auth.organization.id);

  const [accounts, costCenters, alertRules, categories, recurringRules, members, invites, subscription] = await Promise.all([
    db.account.findMany({
      where: { organizationId: auth.organization.id },
      orderBy: [{ isSystemDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, type: true, isSystemDefault: true },
    }),
    db.costCenter.findMany({
      where: { organizationId: auth.organization.id },
      orderBy: [{ isSystemDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isSystemDefault: true },
    }),
    db.alertRule.findMany({
      where: { organizationId: auth.organization.id },
      select: { entityType: true, criticalPercent: true },
    }),
    db.category.findMany({
      where: { organizationId: auth.organization.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.recurringRule.findMany({
      where: { organizationId: auth.organization.id },
      orderBy: [{ active: "desc" }, { entityType: "asc" }, { dayOfMonth: "asc" }],
      select: {
        id: true,
        transactionName: true,
        amount: true,
        type: true,
        entityType: true,
        source: true,
        categoryId: true,
        dayOfMonth: true,
        active: true,
        category: { select: { name: true } },
      },
    }),
    db.membership.findMany({
      where: { organizationId: auth.organization.id },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { userId: true, role: true, user: { select: { email: true, phone: true } } },
      take: 100,
    }),
    db.organizationInvite.findMany({
      where: { organizationId: auth.organization.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, createdAt: true },
      take: 100,
    }),
    db.subscription.findUnique({
      where: { organizationId: auth.organization.id },
      select: { plan: true, status: true, cancelAtPeriodEnd: true, currentPeriodEnd: true, billingCycle: true, trialEndsAt: true },
    }),
  ]);

  const alertByEntity = new Map(alertRules.map((r) => [r.entityType, r.criticalPercent]));
  const initialAlerts = { criticalPercent: Math.max(alertByEntity.get("pf") ?? 80, alertByEntity.get("pj") ?? 80) };
  const categoriesUi = categories.map((c) => ({ ...c, name: displayCategoryName(c.name) }));

  const roleMap: Record<string, string> = {
    owner: t("role.owner"),
    admin: t("role.admin"),
    member: t("role.member"),
  };

  const planMap: Record<string, string> = {
    free: t("subscription.plan.free"),
    starter: t("subscription.plan.starter"),
    basic: t("subscription.plan.basic"),
    pro: t("subscription.plan.pro"),
    enterprise: t("subscription.plan.enterprise"),
  };

  const statusMap: Record<string, string> = {
    trialing: t("subscription.status.trialing"),
    active: t("subscription.status.active"),
    past_due: t("subscription.status.past_due"),
    canceled: t("subscription.status.canceled"),
    inactive: t("subscription.status.inactive"),
  };

  const cycleMap: Record<string, string> = {
    monthly: t("subscription.cycle.monthly"),
    yearly: t("subscription.cycle.yearly"),
  };

  const isCanceling = (subscription?.status === "active" || subscription?.status === "trialing") && subscription?.cancelAtPeriodEnd;
  const currentStatusKey = isCanceling ? "active_canceling" : (subscription?.status || "active");
  const currentStatusLabel = currentStatusKey === "active_canceling" 
    ? t("subscription.status.active_canceling") 
    : statusMap[currentStatusKey] || statusMap["active"];

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formattedEndDate = subscription?.currentPeriodEnd ? dateFormatter.format(subscription.currentPeriodEnd) : null;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="accounts">Contas Bancárias</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="recurring">Recorrência</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-card/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">Organização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">{auth.organization.name}</div>
                  <div className="text-xs text-muted-foreground">Nome da organização</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{roleMap[auth.role] || auth.role}</div>
                  <div className="text-xs text-muted-foreground">Sua permissão</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">Assinatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {planMap[subscription?.plan || "free"]}
                  </div>
                  <div className="text-xs text-muted-foreground">Plano atual</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {currentStatusLabel}
                  </div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
                {isCanceling && formattedEndDate ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {formattedEndDate}
                    </div>
                    <div className="text-xs text-muted-foreground">{t("billing.accessUntil")}</div>
                  </div>
                ) : null}
                <Link
                  href="/billing"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_40px_rgba(0,0,0,0.35)] transition-colors hover:bg-primary/90"
                >
                  {t("settings.viewPlans")}
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">Faturamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {cycleMap[subscription?.billingCycle || "monthly"]}
                  </div>
                  <div className="text-xs text-muted-foreground">Ciclo de cobrança</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {subscription?.trialEndsAt
                      ? new Date(subscription.trialEndsAt).toLocaleDateString("pt-BR")
                      : t("common.emDash")}
                  </div>
                  <div className="text-xs text-muted-foreground">Fim do período de teste</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Cadastre suas contas bancárias para organizar seus lançamentos.</div>
            <AccountDialog mode="create" />
          </div>

          <Card className="bg-card/70 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Contas bancárias</CardTitle>
              <Badge variant="secondary">{accounts.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{displayAccountName(a.name)}</TableCell>
                      <TableCell className="text-right">
                        <AccountDialog mode="edit" account={a} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhuma conta cadastrada ainda.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="bg-card/70 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Centros de custo</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{costCenters.length}</Badge>
                <CostCenterDialog mode="create" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {c.isSystemDefault ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              Padrão
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <CostCenterDialog mode="edit" costCenter={c} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {costCenters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum centro de custo cadastrado ainda.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Regras de alerta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Dispara quando as despesas do mês atingirem o percentual crítico das receitas.
              </div>
              <AlertsForm initial={initialAlerts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Regras mensais para receitas e despesas fixas.</div>
            <RecurringRuleDialog mode="create" categories={categoriesUi} />
          </div>

          <Card className="bg-card/70 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Regras recorrentes</CardTitle>
              <Badge variant="secondary">{recurringRules.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dia</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringRules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.transactionName}</TableCell>
                      <TableCell>
                        <Badge variant={r.type === "income" ? "secondary" : "destructive"}>
                          {r.type === "income" ? "Receita" : "Despesa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.dayOfMonth}</TableCell>
                      <TableCell className="text-muted-foreground">{displayCategoryName(r.category.name)}</TableCell>
                      <TableCell className="text-muted-foreground">{displaySourceName(r.source)}</TableCell>
                      <TableCell>
                        <Badge variant={r.active ? "secondary" : "outline"}>{r.active ? "Ativa" : "Pausada"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RecurringRuleDialog
                          mode="edit"
                          categories={categoriesUi}
                          rule={{
                            id: r.id,
                            transactionName: r.transactionName,
                            amount: r.amount.toString(),
                            type: r.type,
                            entityType: r.entityType,
                            source: r.source,
                            categoryId: r.categoryId,
                            dayOfMonth: r.dayOfMonth,
                            active: r.active,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recurringRules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhuma regra recorrente ainda.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <WhatsappIntegrationCard />
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <TeamManagement
            currentRole={auth.role}
            members={members.map((m) => ({ userId: m.userId, email: m.user.email ?? m.user.phone ?? "—", role: m.role }))}
            invites={invites.map((i) => ({
              id: i.id,
              email: i.email,
              role: i.role,
              createdAt: i.createdAt.toISOString(),
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
