"use client";

import * as React from "react";
import { toast } from "sonner";
import { createCostCenter, updateCostCenter, deleteCostCenter } from "@/app/actions/cost-centers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

type CostCenterItem = {
  id: string;
  name: string;
  isSystemDefault?: boolean;
};

export function CostCenterDialog({ mode, costCenter }: { mode: "create" | "edit"; costCenter?: CostCenterItem }) {
  const locked = mode === "edit" && Boolean(costCenter?.isSystemDefault);
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(costCenter?.name ?? "");

  React.useEffect(() => {
    if (!open) return;
    setName(costCenter?.name ?? "");
  }, [open, costCenter]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = { name };
        if (mode === "create") await createCostCenter(payload);
        else if (costCenter) await updateCostCenter(costCenter.id, payload);
        toast.success(mode === "create" ? "Centro de custo criado." : "Centro de custo atualizado.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  const remove = () => {
    if (!costCenter) return;
    if (locked) return;
    startTransition(async () => {
      try {
        await deleteCostCenter(costCenter.id);
        toast.success("Centro de custo excluído.");
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
          Novo centro de custo
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Editar centro de custo" />}>
          <PencilIcon className="size-4" />
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>{mode === "create" ? "Novo centro de custo" : "Editar centro de custo"}</DialogTitle>
          {mode === "edit" ? (
            <Button variant="outline" onClick={remove} disabled={pending || locked} className="gap-2">
              <Trash2Icon className="size-4" />
              Excluir
            </Button>
          ) : null}
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pessoal, Comercial, Marketing" disabled={pending || locked} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || locked}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
