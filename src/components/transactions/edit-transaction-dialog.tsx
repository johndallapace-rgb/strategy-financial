"use client";

import * as React from "react";
import { toast } from "sonner";
import { deleteTransaction } from "@/app/actions/transactions";
import { TransactionForm, type Option, type TransactionFormValues } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PencilIcon, Trash2Icon } from "lucide-react";

export type TransactionRow = {
  id: string;
  name: string;
  amount: string;
  type: "income" | "expense";
  date: string;
  entityType: "pf" | "pj";
  source: string;
  categoryId: string;
  accountId: string;
  notes: string | null;
  isFixed: boolean;
};

export function EditTransactionDialog({
  tx,
  categories,
  accounts,
  sources,
}: {
  tx: TransactionRow;
  categories: Option[];
  accounts: Option[];
  sources: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const remove = () => {
    startTransition(async () => {
      try {
        await deleteTransaction(tx.id);
        toast.success("Transação excluída.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
      }
    });
  };

  const initial: TransactionFormValues = {
    id: tx.id,
    name: tx.name,
    amount: tx.amount,
    type: tx.type,
    date: tx.date,
    entityType: tx.entityType,
    source: tx.source,
    categoryId: tx.categoryId,
    accountId: tx.accountId,
    notes: tx.notes ?? "",
    kind: tx.isFixed ? "fixed" : "variable",
    makeRecurring: false,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Editar" />}>
        <PencilIcon className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>Editar transação</DialogTitle>
          <Button variant="outline" onClick={remove} disabled={pending} className="gap-2">
            <Trash2Icon className="size-4" />
            Excluir
          </Button>
        </DialogHeader>
        <TransactionForm
          initial={initial}
          categories={categories}
          accounts={accounts}
          sources={sources}
          onSuccess={() => setOpen(false)}
          submitLabel="Salvar alterações"
        />
      </DialogContent>
    </Dialog>
  );
}
