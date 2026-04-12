"use client";

import * as React from "react";
import { toast } from "sonner";
import { upsertAlertRule } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AlertsForm({
  initial,
}: {
  initial: { criticalPercent: number };
}) {
  const [pending, startTransition] = React.useTransition();
  const [criticalPercent, setCriticalPercent] = React.useState(String(initial.criticalPercent));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const value = Number(criticalPercent);
        await upsertAlertRule({ entityType: "pf", criticalPercent: value });
        await upsertAlertRule({ entityType: "pj", criticalPercent: value });
        toast.success("Regras de alerta atualizadas.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Percentual crítico (%)</Label>
        <Input value={criticalPercent} onChange={(e) => setCriticalPercent(e.target.value)} inputMode="numeric" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
