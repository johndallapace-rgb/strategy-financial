"use client";

import * as React from "react";
import { toast } from "sonner";
import { createTransaction, updateTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { displayAccountName } from "@/lib/ptbr";

export type Option = { id: string; name: string };
export type CategoryOption = { id: string; name: string; type: "income" | "expense" };
export type SubcategoryOption = { id: string; name: string; categoryId: string };

export type TransactionFormValues = {
  id?: string;
  draftId?: string;
  name: string;
  amount: string;
  type: "income" | "expense";
  date: string;
  dueDate?: string;
  entityType: "pf" | "pj";
  source: string;
  categoryId: string;
  subcategoryId?: string;
  accountId: string;
  costCenterId?: string;
  notes?: string | null;
  kind: "fixed" | "variable";
  makeRecurring?: boolean;
  dayOfMonth?: number;
};

export function TransactionForm({
  initial,
  categories,
  subcategories,
  accounts,
  costCenters,
  sources,
  onSuccess,
  submitLabel,
}: {
  initial: TransactionFormValues;
  categories: CategoryOption[];
  subcategories: SubcategoryOption[];
  accounts: Option[];
  costCenters: Option[];
  sources: string[];
  onSuccess?: () => void;
  submitLabel?: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [values, setValues] = React.useState<TransactionFormValues>(initial);

  React.useEffect(() => {
    setValues(initial);
  }, [initial]);

  const set = <K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  React.useEffect(() => {
    const allowed = categories.filter((c) => c.type === values.type);
    if (allowed.length === 0) return;
    if (!allowed.some((c) => c.id === values.categoryId)) set("categoryId", allowed[0].id);
  }, [values.type, values.categoryId, categories]);

  React.useEffect(() => {
    const allowed = subcategories.filter((s) => s.categoryId === values.categoryId);
    if (values.subcategoryId && !allowed.some((s) => s.id === values.subcategoryId)) set("subcategoryId", "");
  }, [values.categoryId, values.subcategoryId, subcategories]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        if (values.id) await updateTransaction(values.id, normalize(values));
        else await createTransaction(normalize(values));
        toast.success(values.id ? "Transação atualizada." : "Transação criada.");
        onSuccess?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Mercado" />
        </div>
        <div className="space-y-2">
          <Label>Valor</Label>
          <Input value={values.amount} onChange={(e) => set("amount", e.target.value)} inputMode="decimal" placeholder="0,00" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={values.type}
            onValueChange={(v) => set("type", v === "income" ? "income" : "expense")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar">
                {(v) => (v === "income" ? "Receita" : v === "expense" ? "Despesa" : "Selecionar")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Data de lançamento</Label>
          <Input type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={values.categoryId} onValueChange={(v) => set("categoryId", v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar">
                {(v) => {
                  const id = typeof v === "string" ? v : "";
                  const found = categories.find((c) => c.id === id);
                  return found?.name ?? "Selecionar";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.filter((c) => c.type === values.type).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Subcategoria</Label>
          <Select value={values.subcategoryId ?? ""} onValueChange={(v) => set("subcategoryId", v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar">
                {(v) => {
                  const id = typeof v === "string" ? v : "";
                  const found = subcategories.find((s) => s.id === id);
                  return found?.name ?? "Selecionar";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subcategories
                .filter((s) => s.categoryId === values.categoryId)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Conta bancária</Label>
          <Select value={values.accountId} onValueChange={(v) => set("accountId", v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar">
                {(v) => {
                  const id = typeof v === "string" ? v : "";
                  const found = accounts.find((a) => a.id === id);
                  return found ? displayAccountName(found.name) : "Selecionar";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {displayAccountName(a.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Centro de custo</Label>
          <Select value={values.costCenterId ?? ""} onValueChange={(v) => set("costCenterId", v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar">
                {(v) => {
                  const id = typeof v === "string" ? v : "";
                  const found = costCenters.find((c) => c.id === id);
                  return found?.name ?? "Selecionar";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {costCenters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Origem</Label>
          <Input
            value={values.source}
            onChange={(e) => set("source", e.target.value)}
            placeholder="Ex: WhatsApp, Airbnb, DP Automação"
            list="sources"
          />
          <datalist id="sources">
            {sources.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="space-y-2">
          <Label>Fixa ou variável</Label>
          <Select value={values.kind} onValueChange={(v) => set("kind", v === "fixed" ? "fixed" : "variable")}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar">
                {(v) => (v === "fixed" ? "Fixa" : v === "variable" ? "Variável" : "Selecionar")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixa</SelectItem>
              <SelectItem value="variable">Variável</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={cn("grid gap-4 md:grid-cols-2", values.kind !== "fixed" && "opacity-60")}>
        <div className="space-y-2">
          <Label>Data de vencimento</Label>
          <Input type="date" value={values.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Dia do mês</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={values.dayOfMonth ?? ""}
            onChange={(e) => set("dayOfMonth", e.target.value ? Number(e.target.value) : undefined)}
            disabled={values.kind !== "fixed" || !values.makeRecurring}
            placeholder="Ex: 5"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(values.makeRecurring)}
              onChange={(e) => set("makeRecurring", e.target.checked)}
              disabled={values.kind !== "fixed"}
            />
            <span className="text-sm text-muted-foreground">Tornar recorrente</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observação</Label>
        <Textarea value={values.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {submitLabel ?? "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function normalize(v: TransactionFormValues) {
  return {
    draftId: v.draftId,
    name: v.name,
    amount: v.amount,
    type: v.type,
    date: v.date,
    dueDate: v.dueDate ?? "",
    entityType: v.entityType,
    source: v.source,
    categoryId: v.categoryId,
    subcategoryId: v.subcategoryId ?? "",
    accountId: v.accountId && v.accountId.trim().length > 0 ? v.accountId : undefined,
    costCenterId: v.costCenterId ?? "",
    notes: v.notes ?? "",
    kind: v.kind,
    makeRecurring: Boolean(v.makeRecurring),
    dayOfMonth: v.dayOfMonth,
  };
}
