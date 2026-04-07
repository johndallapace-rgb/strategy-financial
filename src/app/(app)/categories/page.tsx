import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryDialog } from "@/components/categories/category-dialog";
import { displayCategoryName } from "@/lib/ptbr";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, color: true, icon: true },
  });

  const categoriesUi = categories.map((c) => ({ ...c, name: displayCategoryName(c.name) }));

  const income = categoriesUi.filter((c) => c.type === "income");
  const expense = categoriesUi.filter((c) => c.type === "expense");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Ajuste cores e ícones para relatórios mais claros.</div>
        <CategoryDialog mode="create" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Receitas</CardTitle>
            <Badge variant="secondary">{income.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Ícone</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {income.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-xs text-muted-foreground">{c.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.icon}</TableCell>
                    <TableCell className="text-right">
                      <CategoryDialog mode="edit" category={c} />
                    </TableCell>
                  </TableRow>
                ))}
                {income.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma categoria de receita ainda.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Despesas</CardTitle>
            <Badge variant="secondary">{expense.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Ícone</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expense.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-xs text-muted-foreground">{c.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.icon}</TableCell>
                    <TableCell className="text-right">
                      <CategoryDialog mode="edit" category={c} />
                    </TableCell>
                  </TableRow>
                ))}
                {expense.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma categoria de despesa ainda.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
