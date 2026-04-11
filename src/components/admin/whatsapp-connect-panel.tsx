"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectWhatsappAdminAction } from "@/app/admin/actions/integrations";

export function WhatsappConnectPanel({
  connected,
  phoneNumberId,
  businessAccountId,
  disabled,
  disabledReason,
}: {
  connected: boolean;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  disabled: boolean;
  disabledReason: string | null;
}) {
  const [pending, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState(!connected && !disabled);
  const [inputPhoneNumberId, setInputPhoneNumberId] = React.useState(phoneNumberId ?? "");
  const [inputBusinessAccountId, setInputBusinessAccountId] = React.useState(businessAccountId ?? "");

  const canSubmit = !disabled && inputPhoneNumberId.trim().length > 0 && !pending;

  const submit = () => {
    startTransition(async () => {
      try {
        const res = await connectWhatsappAdminAction({
          whatsappPhoneNumberId: inputPhoneNumberId,
          whatsappBusinessAccountId: inputBusinessAccountId,
        });
        if (res.movedFromOrganizationName) {
          toast.success(`WhatsApp conectado. Vínculo movido de “${res.movedFromOrganizationName}”.`);
        } else {
          toast.success(connected ? "Vínculo atualizado." : "WhatsApp conectado.");
        }
        setEditing(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao conectar.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">Status</div>
        <div className="font-medium text-foreground">{connected ? "Conectado" : "Desconectado"}</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">phoneNumberId</div>
        <div className="font-mono text-xs text-foreground">{phoneNumberId ?? "—"}</div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-foreground">{connected ? "Vínculo" : "Conectar WhatsApp"}</div>
          {connected ? (
            <Button variant="outline" className="h-9 rounded-2xl" onClick={() => setEditing((v) => !v)} disabled={pending}>
              {editing ? "Cancelar" : "Atualizar vínculo"}
            </Button>
          ) : null}
        </div>

      {disabled && disabledReason ? <div className="mt-2 text-xs text-muted-foreground">{disabledReason}</div> : null}

        {editing ? (
          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label>Phone Number ID</Label>
              <Input
                value={inputPhoneNumberId}
                onChange={(e) => setInputPhoneNumberId(e.target.value)}
                placeholder="ex: 1234567890"
              disabled={pending || disabled}
              />
              <div className="text-xs text-muted-foreground">
                Use o valor enviado pela Meta em <span className="font-mono">metadata.phone_number_id</span>.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Business Account ID (opcional)</Label>
              <Input
                value={inputBusinessAccountId}
                onChange={(e) => setInputBusinessAccountId(e.target.value)}
                placeholder="ex: 10987654321"
                disabled={pending || disabled}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={!canSubmit} className="h-10 rounded-2xl">
                {pending ? "Conectando..." : connected ? "Salvar vínculo" : "Conectar WhatsApp"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-muted-foreground">
            O toggle WhatsApp Enabled controla apenas o processamento. O vínculo define para qual organização o webhook roteia pelo phoneNumberId.
          </div>
        )}
      </div>
    </div>
  );
}
