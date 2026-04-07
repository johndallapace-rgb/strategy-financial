"use client";

import * as React from "react";
import { toast } from "sonner";
import { createAccount, updateAccount, deleteAccount } from "@/app/actions/accounts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

type AccountItem = {
  id: string;
  name: string;
  type: "pf" | "pj";
};

export function AccountDialog({ mode, account }: { mode: "create" | "edit"; account?: AccountItem }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(account?.name ?? "");
  const [type, setType] = React.useState<AccountItem["type"]>(account?.type ?? "pf");

  React.useEffect(() => {
    if (!open) return;
    setName(account?.name ?? "");
    setType(account?.type ?? "pf");
  }, [open, account]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = { name, type };
        if (mode === "create") await createAccount(payload);
        else if (account) await updateAccount(account.id, payload);
        toast.success(mode === "create" ? "Conta criada." : "Conta atualizada.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  const remove = () => {
    if (!account) return;
    startTransition(async () => {
      try {
        await deleteAccount(account.id);
        toast.success("Conta excluída.");
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
          Nova conta
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Editar conta" />}>
          <PencilIcon className="size-4" />
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>{mode === "create" ? "Nova conta" : "Editar conta"}</DialogTitle>
          {mode === "edit" ? (
            <Button variant="outline" onClick={remove} disabled={pending} className="gap-2">
              <Trash2Icon className="size-4" />
              Excluir
            </Button>
          ) : null}
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Banco X - PF" />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v === "pj" ? "pj" : "pf")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pf">PF</SelectItem>
                <SelectItem value="pj">PJ</SelectItem>
              </SelectContent>
            </Select>
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
