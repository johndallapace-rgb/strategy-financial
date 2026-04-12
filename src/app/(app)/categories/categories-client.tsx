"use client";

import * as React from "react";
import { ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryDialog } from "@/components/categories/category-dialog";

type SubcategoryItem = { id: string; name: string; isSystemDefault: boolean };
type CategoryItem = {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  isSystemDefault: boolean;
  subcategories: SubcategoryItem[];
};

export function CategoriesClient({ categories }: { categories: CategoryItem[] }) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  const expandAll = () => setExpanded(new Set(categories.map((c) => c.id)));
  const collapseAll = () => setExpanded(new Set());
  const toggleOne = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderTable = (items: CategoryItem[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Cor</TableHead>
          <TableHead>Ícone</TableHead>
          <TableHead className="w-[120px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((c) => {
          const isOpen = expanded.has(c.id);
          return (
            <React.Fragment key={c.id}>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleOne(c.id)}
                      className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted/40"
                      aria-label={isOpen ? "Recolher" : "Expandir"}
                    >
                      <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <div className="min-w-0 truncate">{c.name}</div>
                    {c.isSystemDefault ? <span className="text-xs text-muted-foreground">Padrão</span> : null}
                    <span className="text-xs text-muted-foreground">({c.subcategories.length})</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-xs text-muted-foreground">{c.color}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.icon}</TableCell>
                <TableCell className="text-right">
                  {c.isSystemDefault ? (
                    <Button variant="ghost" size="icon-sm" aria-label="Categoria padrão" disabled />
                  ) : (
                    <CategoryDialog mode="edit" category={c} />
                  )}
                </TableCell>
              </TableRow>
              {isOpen ? (
                <TableRow>
                  <TableCell colSpan={4} className="bg-muted/10">
                    {c.subcategories.length > 0 ? (
                      <div className="space-y-1 pl-9 text-sm text-muted-foreground">
                        {c.subcategories.map((s) => (
                          <div key={s.id} className="truncate">
                            - {s.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pl-9 text-sm text-muted-foreground">Sem subcategorias.</div>
                    )}
                  </TableCell>
                </TableRow>
              ) : null}
            </React.Fragment>
          );
        })}
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma categoria ainda.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">Ajuste cores e ícones para relatórios mais claros.</div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className="gap-2" onClick={expandAll}>
            <PlusIcon className="size-4" />
            Expandir tudo
          </Button>
          <Button variant="outline" className="gap-2" onClick={collapseAll}>
            <MinusIcon className="size-4" />
            Recolher tudo
          </Button>
          <CategoryDialog mode="create" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/70 backdrop-blur">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Receitas</CardTitle>
            <Badge variant="secondary">{income.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">{renderTable(income)}</CardContent>
        </Card>

        <Card className="bg-card/70 backdrop-blur">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Despesas</CardTitle>
            <Badge variant="secondary">{expense.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">{renderTable(expense)}</CardContent>
        </Card>
      </div>
    </div>
  );
}
