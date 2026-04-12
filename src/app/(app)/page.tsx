import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { CategoryExpenseChart } from "@/components/charts/category-expense-chart";
import { RevenueExpenseChart } from "@/components/charts/revenue-expense-chart";
import { ensureRecurringTransactionsForMonth, getDashboardData } from "@/lib/finance";
import { requireAuthContext } from "@/lib/auth";
import { formatBRL } from "@/lib/money";
import { displayCategoryName } from "@/lib/ptbr";
import { seedDefaultFinanceForOrganization } from "@/lib/default-finance";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, BadgeCheck, CirclePlus, TrendingDown, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

function baseDateFromMonthParam(month: string | undefined) {
  if (!month) return new Date();
  const [y, m] = month.split("-").map((v) => Number(v));
  if (!y || !m) return new Date();
  return new Date(y, m - 1, 1);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const month = typeof sp.month === "string" ? sp.month : undefined;
  const baseDate = baseDateFromMonthParam(month);

  const auth = await requireAuthContext();
  await seedDefaultFinanceForOrganization(auth.organization.id);
  await ensureRecurringTransactionsForMonth(auth.organization.id, baseDate);
  const data = await getDashboardData(auth.organization.id, baseDate);

  const label = `${format(data.range.start, "MMM yyyy", { locale: ptBR })} · ${format(data.range.start, "dd/MM")}–${format(data.range.end, "dd/MM")}`;
  const prevMonth = format(addMonths(baseDate, -1), "yyyy-MM");
  const nextMonth = format(addMonths(baseDate, 1), "yyyy-MM");

  const totalRatio = data.total.income > 0 ? Math.round((data.total.expense / data.total.income) * 100) : null;
  const hasAnyMovements = data.total.income !== 0 || data.total.expense !== 0;

  const alertCriticalPercent = data.alerts.length ? Math.max(...data.alerts.map((a) => a.criticalPercent)) : 80;
  const combinedAlert =
    data.total.income > 0 && totalRatio !== null && totalRatio >= alertCriticalPercent
      ? { percent: totalRatio, criticalPercent: alertCriticalPercent, income: data.total.income, expense: data.total.expense }
      : null;

  const hasTimeseries = data.timeseries.some((p) => p.income !== 0 || p.expense !== 0);
  const categoryData = data.categorySlices.map((s) => ({ name: displayCategoryName(s.name), color: s.color, total: s.total }));
  const hasCategoryBreakdown = categoryData.some((s) => s.total > 0);

  const outlineBtnSm =
    "inline-flex h-7 items-center justify-center rounded-lg border border-input/70 bg-card/40 px-3 text-[0.8rem] font-medium text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-colors hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
  const outlineBtn =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-input/70 bg-card/40 px-4 text-sm font-medium text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-colors hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
  const cardShell =
    "fade-in-up relative overflow-hidden border bg-card/70 backdrop-blur transition-all duration-200 hover:shadow-lg hover:shadow-black/10";

  return (
    <div className="space-y-7 fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-wide text-muted-foreground">Visão do período</div>
          <div className="truncate text-sm font-semibold text-foreground">{label}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link className={outlineBtnSm} href={`/?month=${prevMonth}`}>
            Anterior
          </Link>
          <Link className={outlineBtnSm} href={`/?month=${nextMonth}`}>
            Próximo
          </Link>
          <Badge
            variant={totalRatio !== null && totalRatio >= 80 ? "destructive" : "secondary"}
            className={totalRatio !== null && totalRatio >= 80 ? "" : "text-muted-foreground"}
          >
            {totalRatio === null ? "Sem receitas" : `${totalRatio}% do faturamento`}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Saldo total" value={formatBRL(data.total.balance)} subtitle="Acumulado até o fim do período" />
        <KpiCard
          title="Receitas"
          value={formatBRL(data.total.income)}
          valueClassName="text-emerald-600 dark:text-emerald-400"
          subtitle="Entradas confirmadas no período"
        />
        <KpiCard
          title="Despesas"
          value={formatBRL(data.total.expense)}
          valueClassName="text-red-600 dark:text-red-400"
          subtitle="Saídas confirmadas no período"
        />
        <KpiCard title="Resultado líquido" value={formatBRL(data.total.net)} subtitle="Receitas - despesas" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={cardShell}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Receitas x despesas</CardTitle>
              <div className="text-xs text-muted-foreground">Evolução ao longo do período selecionado</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <TrendingUp className="size-3" />
                Receitas
              </Badge>
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <TrendingDown className="size-3" />
                Despesas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {hasTimeseries ? (
              <RevenueExpenseChart data={data.timeseries} />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center rounded-xl border bg-card/40 px-5">
                <div className="max-w-sm text-center">
                  <div className="text-sm font-semibold text-foreground">Sem movimentações no período</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Adicione receitas e despesas para visualizar a evolução do caixa.
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Link className={outlineBtn} href="/transactions/new">
                      <CirclePlus className="size-4" />
                      Criar primeira transação
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className={cardShell}>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Distribuição por categoria</CardTitle>
              <div className="text-xs text-muted-foreground">Concentração das despesas no período selecionado</div>
            </div>
          </CardHeader>
          <CardContent>
            {hasCategoryBreakdown ? (
              <div className="space-y-4">
                <CategoryExpenseChart data={categoryData} />
                <div className="space-y-2">
                  {categoryData
                    .slice()
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 6)
                    .map((s) => (
                      <div key={s.name} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="truncate text-muted-foreground">{s.name}</span>
                        </div>
                        <span className="font-medium text-foreground">{formatBRL(s.total)}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[280px] items-center justify-center rounded-xl border bg-card/40 px-5">
                <div className="max-w-sm text-center">
                  <div className="text-sm font-semibold text-foreground">Nada para distribuir ainda</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Categorize suas despesas para ver onde o dinheiro está concentrado.
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Link className={outlineBtn} href="/transactions/new">
                      <CirclePlus className="size-4" />
                      Adicionar movimentações
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className={`${cardShell} lg:col-span-2`}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Alertas do período</CardTitle>
              <div className="text-xs text-muted-foreground">Monitoramento automático de excessos de gasto</div>
            </div>
            <Badge variant={combinedAlert ? "destructive" : "secondary"} className={combinedAlert ? "" : "gap-1 text-muted-foreground"}>
              {combinedAlert ? (
                <>
                  <AlertTriangle className="size-3" />
                  1 alerta
                </>
              ) : (
                <>
                  <BadgeCheck className="size-3" />
                  Tudo certo
                </>
              )}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {combinedAlert ? (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Despesas acima do limite</div>
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" />
                    {combinedAlert.percent}% &gt;= {combinedAlert.criticalPercent}%
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                  <div className="text-emerald-600 dark:text-emerald-400">Receitas: {formatBRL(combinedAlert.income)}</div>
                  <div className="text-red-600 dark:text-red-400">Despesas: {formatBRL(combinedAlert.expense)}</div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Ajuste o percentual crítico em configurações caso necessário.</div>
              </div>
            ) : (
              <div className="rounded-xl border bg-card/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border bg-card/60 p-2 text-muted-foreground">
                    <BadgeCheck className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground">Sem alertas neste período</div>
                    <div className="text-sm text-muted-foreground">
                      Quando as despesas ultrapassarem o limite configurado, você verá os detalhes aqui.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={cardShell}>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-base">Saúde financeira</CardTitle>
                <div className="text-xs text-muted-foreground">Fixas x variáveis no período</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fixas (receitas)</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatBRL(data.fixed.income)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fixas (despesas)</span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatBRL(data.fixed.expense)}</span>
              </div>
              <div className="my-2 h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Variáveis (receitas)</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatBRL(data.variable.income)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Variáveis (despesas)</span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatBRL(data.variable.expense)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={cardShell}>
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-base">Projeção do próximo mês</CardTitle>
                <div className="text-xs text-muted-foreground">Estimativa com base nas transações fixas</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{formatBRL(data.projection.projectedTotal)}</span>
              </div>
              <div className="mt-2 rounded-lg border bg-card p-2 text-xs text-muted-foreground">
                Baseada nas transações fixas deste mês.
              </div>
              {!hasAnyMovements ? (
                <div className="pt-2">
                  <Link className={outlineBtn} href="/transactions/new">
                    <CirclePlus className="size-4" />
                    Adicionar movimentações
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
