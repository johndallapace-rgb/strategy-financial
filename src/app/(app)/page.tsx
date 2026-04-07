import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { CategoryExpenseChart } from "@/components/charts/category-expense-chart";
import { RevenueExpenseChart } from "@/components/charts/revenue-expense-chart";
import { ensureRecurringTransactionsForMonth, getDashboardData } from "@/lib/finance";
import { formatBRL } from "@/lib/money";
import { displayCategoryName } from "@/lib/ptbr";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  await ensureRecurringTransactionsForMonth(baseDate);
  const data = await getDashboardData(baseDate);

  const label = `${format(data.range.start, "MMM yyyy", { locale: ptBR })} · ${format(data.range.start, "dd/MM")}–${format(data.range.end, "dd/MM")}`;
  const prevMonth = format(addMonths(baseDate, -1), "yyyy-MM");
  const nextMonth = format(addMonths(baseDate, 1), "yyyy-MM");

  const totalRatio = data.total.income > 0 ? Math.round((data.total.expense / data.total.income) * 100) : null;
  const outlineBtnSm =
    "inline-flex h-7 items-center justify-center rounded-lg border border-input/70 bg-card/40 px-3 text-[0.8rem] font-medium text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-colors hover:bg-card/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Período</div>
          <div className="truncate text-sm font-medium">{label}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link className={outlineBtnSm} href={`/?month=${prevMonth}`}>
            Anterior
          </Link>
          <Link className={outlineBtnSm} href={`/?month=${nextMonth}`}>
            Próximo
          </Link>
          <Badge variant={totalRatio !== null && totalRatio >= 80 ? "destructive" : "secondary"}>
            {totalRatio === null ? "Sem receitas" : `${totalRatio}% gasto`}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Saldo total" value={formatBRL(data.total.balance)} subtitle="Acumulado até o fim do período" />
        <KpiCard
          title="Receitas"
          value={formatBRL(data.total.income)}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          title="Despesas"
          value={formatBRL(data.total.expense)}
          valueClassName="text-red-600 dark:text-red-400"
        />
        <KpiCard title="Resultado líquido" value={formatBRL(data.total.net)} subtitle="Receitas - despesas" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">PF</CardTitle>
            <Badge variant="outline">Saldo: {formatBRL(data.pf.balance)}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Receitas</div>
              <div className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                {formatBRL(data.pf.income)}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Despesas</div>
              <div className="mt-1 font-semibold text-red-600 dark:text-red-400">{formatBRL(data.pf.expense)}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Líquido</div>
              <div className="mt-1 font-semibold">{formatBRL(data.pf.net)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">PJ</CardTitle>
            <Badge variant="outline">Saldo: {formatBRL(data.pj.balance)}</Badge>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Receitas</div>
              <div className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                {formatBRL(data.pj.income)}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Despesas</div>
              <div className="mt-1 font-semibold text-red-600 dark:text-red-400">{formatBRL(data.pj.expense)}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Líquido</div>
              <div className="mt-1 font-semibold">{formatBRL(data.pj.net)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Receitas x despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueExpenseChart data={data.timeseries} />
          </CardContent>
        </Card>
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryExpenseChart
              data={data.categorySlices.map((s) => ({ name: displayCategoryName(s.name), color: s.color, total: s.total }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Alertas</CardTitle>
            <Badge variant={data.alerts.length ? "destructive" : "secondary"}>
              {data.alerts.length ? `${data.alerts.length} alerta(s)` : "Ok"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.alerts.length ? (
              data.alerts.map((a) => (
                <div key={a.entityType} className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{a.entityType.toUpperCase()}</div>
                    <Badge variant="destructive">
                      {a.percent}% &gt;= {a.criticalPercent}%
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div className="text-emerald-600 dark:text-emerald-400">Receitas: {formatBRL(a.income)}</div>
                    <div className="text-red-600 dark:text-red-400">Despesas: {formatBRL(a.expense)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border bg-card/50 p-3 text-sm text-muted-foreground">
                Nenhum excesso de gasto detectado no período.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Fixas x variáveis</CardTitle>
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

          <Card className="bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Projeção (próximo mês)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{formatBRL(data.projection.projectedTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PF</span>
                <span className="font-medium">{formatBRL(data.projection.projectedByEntity.pf)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PJ</span>
                <span className="font-medium">{formatBRL(data.projection.projectedByEntity.pj)}</span>
              </div>
              <div className="mt-2 rounded-lg border bg-card p-2 text-xs text-muted-foreground">
                Baseada nas transações fixas deste mês.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
