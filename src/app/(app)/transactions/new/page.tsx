import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { displayCategoryName, displaySourceName } from "@/lib/ptbr";
import { requireAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewTransactionPage() {
  const auth = await requireAuthContext();
  const [categories, accounts, sources] = await Promise.all([
    db.category.findMany({
      where: { organizationId: auth.organization.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.account.findMany({
      where: { organizationId: auth.organization.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.transaction.findMany({
      where: { organizationId: auth.organization.id },
      select: { source: true },
      distinct: ["source"],
      orderBy: { source: "asc" },
      take: 200,
    }),
  ]);

  const categoriesUi = categories.map((c) => ({ ...c, name: displayCategoryName(c.name) }));
  const sourcesUi = sources.map((s) => displaySourceName(s.source));

  const defaultCategory = categories[0]?.id ?? "";
  const defaultAccount = accounts[0]?.id ?? "";

  return (
    <Card className="max-w-3xl bg-card/70 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">Nova transação</CardTitle>
      </CardHeader>
      <CardContent>
        <TransactionForm
          initial={{
            name: "",
            amount: "",
            type: "expense",
            date: todayIso(),
            entityType: "pf",
            source: "",
            categoryId: defaultCategory,
            accountId: defaultAccount,
            notes: "",
            kind: "variable",
            makeRecurring: false,
          }}
          categories={categoriesUi}
          accounts={accounts}
          sources={sourcesUi}
          submitLabel="Criar transação"
        />
      </CardContent>
    </Card>
  );
}
