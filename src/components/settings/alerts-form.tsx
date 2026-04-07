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
  initial: { pf: number; pj: number };
}) {
  const [pending, startTransition] = React.useTransition();
  const [pf, setPf] = React.useState(String(initial.pf));
  const [pj, setPj] = React.useState(String(initial.pj));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const pfVal = Number(pf);
        const pjVal = Number(pj);
        await upsertAlertRule({ entityType: "pf", criticalPercent: pfVal });
        await upsertAlertRule({ entityType: "pj", criticalPercent: pjVal });
        toast.success("Regras de alerta atualizadas.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>PF · Percentual crítico (%)</Label>
          <Input value={pf} onChange={(e) => setPf(e.target.value)} inputMode="numeric" />
        </div>
        <div className="space-y-2">
          <Label>PJ · Percentual crítico (%)</Label>
          <Input value={pj} onChange={(e) => setPj(e.target.value)} inputMode="numeric" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
