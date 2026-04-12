"use client";

import * as React from "react";
import { toast } from "sonner";
import { createCategory, updateCategory, deleteCategory, listSubcategories, createSubcategory, deleteSubcategory } from "@/app/actions/categories";
import { Badge } from "@/components/ui/badge";
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
  isSystemDefault?: boolean;
};

export function CategoryDialog({
  mode,
  category,
}: {
  mode: "create" | "edit";
  category?: CategoryItem;
}) {
  const locked = mode === "edit" && Boolean(category?.isSystemDefault);
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(category?.name ?? "");
  const [type, setType] = React.useState<CategoryItem["type"]>(category?.type ?? "expense");
  const [color, setColor] = React.useState(category?.color ?? "#3B82F6");
  const [icon, setIcon] = React.useState(category?.icon ?? "tag");
  const [subcategories, setSubcategories] = React.useState<Array<{ id: string; name: string; isSystemDefault: boolean }>>([]);
  const [subName, setSubName] = React.useState("");
  const [subLoading, setSubLoading] = React.useState(false);
  const [pendingSubNames, setPendingSubNames] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setType(category?.type ?? "expense");
    setColor(category?.color ?? "#3B82F6");
    setIcon(category?.icon ?? "tag");
    setSubName("");
    setPendingSubNames([]);
    setSubcategories([]);
    if (mode === "edit" && category?.id) {
      setSubLoading(true);
      listSubcategories(category.id)
        .then((list) => setSubcategories(list))
        .catch(() => setSubcategories([]))
        .finally(() => setSubLoading(false));
    }
  }, [open, category, mode]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    startTransition(async () => {
      try {
        const payload = { name, type, color, icon };
        if (mode === "create") {
          const id = await createCategory(payload);
          if (pendingSubNames.length > 0) {
            for (const n of pendingSubNames) {
              try {
                await createSubcategory({ categoryId: id, name: n });
              } catch {}
            }
          }
        }
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
    if (locked) return;
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

  const addSubcategory = () => {
    const trimmed = subName.trim();
    if (!trimmed) return;
    if (locked) return;
    if (mode === "create") {
      if (pendingSubNames.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
      setPendingSubNames((prev) => [...prev, trimmed]);
      setSubName("");
      return;
    }

    if (!category?.id) return;
    startTransition(async () => {
      try {
        await createSubcategory({ categoryId: category.id, name: trimmed });
        const list = await listSubcategories(category.id);
        setSubcategories(list);
        setSubName("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao adicionar subcategoria.");
      }
    });
  };

  const removeSubcategory = (id: string) => {
    if (mode === "create") {
      setPendingSubNames((prev) => prev.filter((n) => n !== id));
      return;
    }
    const existing = subcategories.find((s) => s.id === id);
    if (existing?.isSystemDefault) return;
    startTransition(async () => {
      try {
        await deleteSubcategory(id);
        setSubcategories((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao remover subcategoria.");
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
          <div className="flex items-center gap-2">
            <DialogTitle>{mode === "create" ? "Nova categoria" : "Editar categoria"}</DialogTitle>
            {locked ? <Badge variant="secondary">Padrão do sistema</Badge> : null}
          </div>
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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mercado" disabled={pending || locked} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v === "income" ? "income" : "expense")} disabled={pending || locked}>
                <SelectTrigger disabled={pending || locked}>
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
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#3B82F6" disabled={pending || locked} />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={pending || locked}
                  className="h-10 w-10 rounded-md border bg-background p-1 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone (lucide)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Ex: shopping-basket" disabled={pending || locked} />
          </div>

          <div className="space-y-2">
            <Label>Subcategorias</Label>
            <div className="flex items-center gap-2">
              <Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Ex: Mercado" disabled={pending || locked} />
              <Button type="button" variant="outline" onClick={addSubcategory} disabled={pending || locked}>
                Adicionar
              </Button>
            </div>
            {mode === "edit" ? (
              <div className="space-y-2">
                {subLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando subcategorias...</div>
                ) : subcategories.length > 0 ? (
                  <div className="space-y-1 rounded-md border border-border/60 bg-background/10 p-2">
                    {subcategories.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-sm text-muted-foreground">{s.name}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeSubcategory(s.id)}
                          disabled={pending || s.isSystemDefault || Boolean(category?.isSystemDefault)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhuma subcategoria.</div>
                )}
              </div>
            ) : pendingSubNames.length > 0 ? (
              <div className="space-y-1 rounded-md border border-border/60 bg-background/10 p-2">
                {pendingSubNames.map((n) => (
                  <div key={n} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-sm text-muted-foreground">{n}</div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeSubcategory(n)} disabled={pending}>
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Adicione subcategorias e clique em salvar.</div>
            )}
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
