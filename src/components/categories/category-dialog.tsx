"use client";

import * as React from "react";
import { toast } from "sonner";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions/categories";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2Icon, PlusIcon, PencilIcon } from "lucide-react";

type CategoryItem = {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
};

export function CategoryDialog({
  mode,
  category,
}: {
  mode: "create" | "edit";
  category?: CategoryItem;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(category?.name ?? "");
  const [type, setType] = React.useState<CategoryItem["type"]>(category?.type ?? "expense");
  const [color, setColor] = React.useState(category?.color ?? "#3B82F6");
  const [icon, setIcon] = React.useState(category?.icon ?? "tag");

  React.useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setType(category?.type ?? "expense");
    setColor(category?.color ?? "#3B82F6");
    setIcon(category?.icon ?? "tag");
  }, [open, category]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = { name, type, color, icon };
        if (mode === "create") await createCategory(payload);
        else if (category) await updateCategory(category.id, payload);
        toast.success(mode === "create" ? "Categoria criada." : "Categoria atualizada.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  const remove = () => {
    if (!category) return;
    startTransition(async () => {
      try {
        await deleteCategory(category.id);
        toast.success("Categoria excluída.");
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
          Nova categoria
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Editar categoria" />}>
          <PencilIcon className="size-4" />
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-center justify-between">
          <DialogTitle>{mode === "create" ? "Nova categoria" : "Editar categoria"}</DialogTitle>
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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mercado" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#3B82F6" />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-10 rounded-md border bg-background p-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone (lucide)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Ex: shopping-basket" />
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
