"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrganizationFeatureConfigAction, upsertWhatsappConnectionAction } from "@/app/actions/integrations";

type FeatureConfig = {
  whatsappEnabled: boolean;
  whatsappReceiveText: boolean;
  whatsappReceiveAudio: boolean;
  whatsappReceiveImage: boolean;
  openAiEnabled: boolean;
  openAiTextParsing: boolean;
  openAiAudioTranscription: boolean;
  openAiImageUnderstanding: boolean;
  autoReplyEnabled: boolean;
  memoryLongEnabled: boolean;
  multiAgentEnabled: boolean;
  manualReviewRequired: boolean;
  autoApprovalEnabled: boolean;
  monthlyCostLimitCents: number;
};

type WhatsappConnection = {
  enabled: boolean;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
};

export function IntegrationsManagement({
  canManage,
  initialConfig,
  initialWhatsapp,
}: {
  canManage: boolean;
  initialConfig: FeatureConfig;
  initialWhatsapp: WhatsappConnection;
}) {
  const [pending, startTransition] = React.useTransition();
  const [config, setConfig] = React.useState<FeatureConfig>(initialConfig);
  const [whatsapp, setWhatsapp] = React.useState<WhatsappConnection>(initialWhatsapp);

  const setFlag = (key: keyof FeatureConfig) => (v: boolean) => setConfig((c) => ({ ...c, [key]: v }));

  const save = () => {
    startTransition(async () => {
      try {
        await upsertWhatsappConnectionAction({
          enabled: whatsapp.enabled,
          whatsappPhoneNumberId: whatsapp.whatsappPhoneNumberId,
          whatsappBusinessAccountId: whatsapp.whatsappBusinessAccountId,
        });
        await updateOrganizationFeatureConfigAction({
          ...config,
          monthlyCostLimitCents: Number.isFinite(config.monthlyCostLimitCents) ? config.monthlyCostLimitCents : 0,
        });
        toast.success("Integrações atualizadas.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">WhatsApp</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border bg-background/10 px-4 py-3">
            <div className="text-sm text-muted-foreground">Ativar WhatsApp</div>
            <input
              type="checkbox"
              checked={whatsapp.enabled}
              disabled={!canManage || pending}
              onChange={(e) => setWhatsapp((c) => ({ ...c, enabled: e.target.checked }))}
              className="h-4 w-4 accent-[var(--strategy-neon)]"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number ID</Label>
            <Input
              value={whatsapp.whatsappPhoneNumberId}
              onChange={(e) => setWhatsapp((c) => ({ ...c, whatsappPhoneNumberId: e.target.value }))}
              placeholder="ex: 1234567890"
              disabled={!canManage || pending}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Business Account ID (opcional)</Label>
            <Input
              value={whatsapp.whatsappBusinessAccountId}
              onChange={(e) => setWhatsapp((c) => ({ ...c, whatsappBusinessAccountId: e.target.value }))}
              placeholder="ex: 10987654321"
              disabled={!canManage || pending}
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          O webhook oficial deve apontar para <span className="font-mono">/api/whatsapp/webhook</span>. A verificação usa{" "}
          <span className="font-mono">WHATSAPP_VERIFY_TOKEN</span>.
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">Feature flags</div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["whatsappEnabled", "WhatsApp ativo"],
            ["whatsappReceiveText", "Receber texto"],
            ["whatsappReceiveAudio", "Receber áudio"],
            ["whatsappReceiveImage", "Receber imagem"],
            ["openAiEnabled", "OpenAI ativa"],
            ["openAiTextParsing", "Interpretação de texto"],
            ["openAiAudioTranscription", "Interpretação de áudio"],
            ["openAiImageUnderstanding", "Interpretação de imagem"],
            ["autoReplyEnabled", "Resposta automática"],
            ["memoryLongEnabled", "Memória longa"],
            ["multiAgentEnabled", "Multiagente"],
            ["manualReviewRequired", "Revisão manual obrigatória"],
            ["autoApprovalEnabled", "Aprovação automática"],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border bg-background/10 px-4 py-3">
              <div className="text-sm text-muted-foreground">{label}</div>
              <input
                type="checkbox"
                checked={config[key as keyof FeatureConfig] as boolean}
                disabled={!canManage || pending}
                onChange={(e) => setFlag(key as keyof FeatureConfig)(e.target.checked)}
                className="h-4 w-4 accent-[var(--strategy-neon)]"
              />
            </div>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Limite mensal de custo (centavos)</Label>
            <Input
              inputMode="numeric"
              value={String(config.monthlyCostLimitCents)}
              onChange={(e) => setConfig((c) => ({ ...c, monthlyCostLimitCents: Number(e.target.value || 0) }))}
              disabled={!canManage || pending}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!canManage || pending} className="h-10 rounded-xl">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
