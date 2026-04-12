"use client";

import * as React from "react";
import { toast } from "sonner";
import { createRecurringRule, updateRecurringRule, deleteRecurringRule } from "@/app/actions/recurring";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2Icon, PlusIcon, PencilIcon } from "lucide-react";

type Option = { id: string; name: string };

type RuleItem = {
  id: string;
  transactionName: string;
  amount: string;
  type: "income" | "expense";
  entityType: "pf" | "pj";
  source: string;
  categoryId: string;
  dayOfMonth: number;
  active: boolean;
};

export function RecurringRuleDialog({
  mode,
  categories,
  rule,
}: {
  mode: "create" | "edit";
  categories: Option[];
  rule?: RuleItem;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [transactionName, setTransactionName] = React.useState(rule?.transactionName ?? "");
  const [amount, setAmount] = React.useState(rule?.amount ?? "");
  const [type, setType] = React.useState<RuleItem["type"]>(rule?.type ?? "expense");
  const [entityType, setEntityType] = React.useState<RuleItem["entityType"]>(rule?.entityType ?? "pf");
  const [source, setSource] = React.useState(rule?.source ?? "");
  const [categoryId, setCategoryId] = React.useState(rule?.categoryId ?? categories[0]?.id ?? "");
  const [dayOfMonth, setDayOfMonth] = React.useState(String(rule?.dayOfMonth ?? 1));
  const [active, setActive] = React.useState(Boolean(rule?.active ?? true));

  React.useEffect(() => {
    if (!open) return;
    setTransactionName(rule?.transactionName ?? "");
    setAmount(rule?.amount ?? "");
    setType(rule?.type ?? "expense");
    setEntityType(rule?.entityType ?? "pf");
    setSource(rule?.source ?? "");
    setCategoryId(rule?.categoryId ?? categories[0]?.id ?? "");
    setDayOfMonth(String(rule?.dayOfMonth ?? 1));
    setActive(Boolean(rule?.active ?? true));
  }, [open, rule, categories]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          transactionName,
          amount,
          type,
          entityType,
          source,
          categoryId,
          dayOfMonth: Number(dayOfMonth),
          active,
        };
        if (mode === "create") await createRecurringRule(payload);
        else if (rule) await updateRecurringRule(rule.id, payload);
        toast.success(mode === "create" ? "Regra criada." : "Regra atualizada.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  const remove = () => {
    if (!rule) return;
    startTransition(async () => {
      try {
        await deleteRecurringRule(rule.id);
        toast.success("Regra excluída.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <DialogTrigger render={<Button className="gap-2" />}>
          <PlusIcon className="size-4" />
          Nova regra
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Editar regra" />}>
          <PencilIcon className="size-4" />
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>{mode === "create" ? "Nova regra recorrente" : "Editar regra recorrente"}</DialogTitle>
          {mode === "edit" ? (
            <Button variant="outline" onClick={remove} disabled={pending} className="gap-2">
              <Trash2Icon className="size-4" />
              Excluir
            </Button>
          ) : null}
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={transactionName} onChange={(e) => setTransactionName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v === "income" ? "income" : "expense")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dia do mês</Label>
              <Input type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
            </div>
            <div className="space-y-2" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex: Airbnb" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm text-muted-foreground">Ativa</span>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
