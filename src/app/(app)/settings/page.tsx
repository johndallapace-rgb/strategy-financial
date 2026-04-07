import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountDialog } from "@/components/settings/account-dialog";
import { AlertsForm } from "@/components/settings/alerts-form";
import { RecurringRuleDialog } from "@/components/settings/recurring-rule-dialog";
import { displayCategoryName, displaySourceName } from "@/lib/ptbr";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [accounts, alertRules, categories, recurringRules] = await Promise.all([
    db.account.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }], select: { id: true, name: true, type: true } }),
    db.alertRule.findMany({ select: { entityType: true, criticalPercent: true } }),
    db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.recurringRule.findMany({
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
  ]);

  const alertByEntity = new Map(alertRules.map((r) => [r.entityType, r.criticalPercent]));
  const initialAlerts = { pf: alertByEntity.get("pf") ?? 80, pj: alertByEntity.get("pj") ?? 80 };
  const categoriesUi = categories.map((c) => ({ ...c, name: displayCategoryName(c.name) }));

  return (
    <div className="space-y-4">
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Contas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="recurring">Recorrência</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Crie contas PF/PJ para organizar seus lançamentos.</div>
            <AccountDialog mode="create" />
          </div>

          <Card className="bg-card/70 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Contas</CardTitle>
              <Badge variant="secondary">{accounts.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AccountDialog mode="edit" account={a} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhuma conta cadastrada ainda.
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
                    <TableHead>PF/PJ</TableHead>
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
                      <TableCell>
                        <Badge variant="outline">{r.entityType.toUpperCase()}</Badge>
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
                      <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
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
          <Card className="bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Integrações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                Estrutura pronta para evoluir com WhatsApp, automações e um futuro centro de integrações.
              </div>
              <div className="rounded-xl border bg-card p-3">
                <div className="font-medium text-foreground">WhatsApp</div>
                <div className="mt-1">
                  Planejado para ler mensagens, gerar rascunhos e confirmar lançamentos antes de salvar.
                </div>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <div className="font-medium text-foreground">Relatórios e exportação</div>
                <div className="mt-1">Camada de dados pronta para relatórios mensais e exportações.</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
