import Link from "next/link";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { displayCategoryName, displaySourceName } from "@/lib/ptbr";
import { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";

export const dynamic = "force-dynamic";

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDateParam(v: string | undefined) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const outlineLink =
    "inline-flex h-8 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
  const secondaryLink =
    "inline-flex h-8 items-center justify-center rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
  const primaryBtn =
    "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const entityType = sp.entityType === "pf" || sp.entityType === "pj" ? sp.entityType : undefined;
  const type = sp.type === "income" || sp.type === "expense" ? sp.type : undefined;
  const kind = sp.kind === "fixed" || sp.kind === "variable" ? sp.kind : undefined;
  const source = typeof sp.source === "string" ? sp.source.trim() : "";
  const categoryId = typeof sp.categoryId === "string" ? sp.categoryId : "";
  const from = parseDateParam(typeof sp.from === "string" ? sp.from : undefined);
  const to = parseDateParam(typeof sp.to === "string" ? sp.to : undefined);

  const categoriesRaw = await db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const accounts = await db.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const sources = await db.transaction.findMany({
    select: { source: true },
    distinct: ["source"],
    orderBy: { source: "asc" },
    take: 200,
  });

  const categories = categoriesRaw.map((c) => ({ ...c, name: displayCategoryName(c.name) }));
  const sourcesUi = sources.map((s) => displaySourceName(s.source));

  const where: Prisma.TransactionWhereInput = {
    ...(entityType ? { entityType } : {}),
    ...(type ? { type } : {}),
    ...(kind ? { isFixed: kind === "fixed" } : {}),
    ...(source ? { source: { contains: source, mode: "insensitive" } } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { source: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await db.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 250,
    select: {
      id: true,
      name: true,
      amount: true,
      type: true,
      date: true,
      entityType: true,
      source: true,
      categoryId: true,
      accountId: true,
      notes: true,
      isFixed: true,
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
  });

  const totals = rows.reduce(
    (acc, r) => {
      const v = Number(r.amount.toString());
      if (r.type === "income") acc.income += v;
      else acc.expense += v;
      return acc;
    },
    { income: 0, expense: 0 },
  );
  const net = totals.income - totals.expense;

  return (
    <div className="space-y-4">
      <Card className="bg-card/70 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Filtros</CardTitle>
          <div className="flex items-center gap-2">
            <Link className={outlineLink} href="/transactions">
              Limpar
            </Link>
            <Link className={secondaryLink} href="/transactions/new">
              Nova transação
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-6" action="/transactions" method="get">
            <div className="md:col-span-2">
              <Input name="q" defaultValue={q} placeholder="Buscar por nome, origem ou observação…" />
            </div>
            <div className="md:col-span-1">
              <select
                name="entityType"
                defaultValue={entityType ?? ""}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">PF/PJ</option>
                <option value="pf">PF</option>
                <option value="pj">PJ</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <select
                name="type"
                defaultValue={type ?? ""}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Tipo</option>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <select
                name="kind"
                defaultValue={kind ?? ""}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Fixa/Variável</option>
                <option value="fixed">Fixa</option>
                <option value="variable">Variável</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <select
                name="categoryId"
                defaultValue={categoryId}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Input name="source" defaultValue={source} placeholder="Origem (ex: Airbnb, DP Automação)" />
            </div>
            <div className="md:col-span-2">
              <Input type="date" name="from" defaultValue={from ? toDateOnly(from) : ""} />
            </div>
            <div className="md:col-span-2">
              <Input type="date" name="to" defaultValue={to ? toDateOnly(to) : ""} />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <button type="submit" className={primaryBtn}>
                Aplicar
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card/70 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Transações</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{rows.length} itens</Badge>
            <Badge variant="outline">Receitas: {formatBRL(totals.income)}</Badge>
            <Badge variant="outline">Despesas: {formatBRL(totals.expense)}</Badge>
            <Badge variant={net < 0 ? "destructive" : "secondary"}>Líquido: {formatBRL(net)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>PF/PJ</TableHead>
                  <TableHead>F/V</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const amount = Number(r.amount.toString());
                  const date = r.date.toISOString().slice(0, 10);
                  const amountClass =
                    r.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{date}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{displayCategoryName(r.category.name)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.account.name}</TableCell>
                    <TableCell className="text-muted-foreground">{displaySourceName(r.source)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.entityType.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                      <Badge variant="secondary">{r.isFixed ? "Fixa" : "Var"}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${amountClass}`}>{formatBRL(amount)}</TableCell>
                      <TableCell className="text-right">
                        <EditTransactionDialog
                          tx={{
                            id: r.id,
                            name: r.name,
                            amount: r.amount.toString(),
                            type: r.type,
                            date,
                            entityType: r.entityType,
                            source: r.source,
                            categoryId: r.categoryId,
                            accountId: r.accountId,
                            notes: r.notes,
                            isFixed: r.isFixed,
                          }}
                          categories={categories}
                          accounts={accounts}
                          sources={sourcesUi}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
