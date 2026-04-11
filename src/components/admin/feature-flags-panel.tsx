"use client";

import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateOrgFeatureConfigAdminAction } from "@/app/admin/actions/features";

export type FeatureConfig = {
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

function FlagRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/10 px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

export function FeatureFlagsPanel({
  canManage,
  initialConfig,
  lockedReason,
}: {
  canManage: boolean;
  initialConfig: FeatureConfig;
  lockedReason?: string | null;
}) {
  const [pending, startTransition] = React.useTransition();
  const [config, setConfig] = React.useState<FeatureConfig>(initialConfig);

  const setFlag = (key: keyof FeatureConfig) => (v: boolean) => setConfig((c) => ({ ...c, [key]: v }));

  const save = () => {
    startTransition(async () => {
      try {
        await updateOrgFeatureConfigAdminAction({
          ...config,
          monthlyCostLimitCents: Number.isFinite(config.monthlyCostLimitCents) ? config.monthlyCostLimitCents : 0,
        });
        toast.success("Funcionalidades atualizadas.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">Controle de Funcionalidades</div>
        <div className="text-xs text-muted-foreground">Toggles por organização. Alterações registradas em logs.</div>
      </div>

      {lockedReason ? <div className="rounded-2xl border border-border/50 bg-background/10 px-4 py-3 text-xs text-muted-foreground">{lockedReason}</div> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <FlagRow label="WhatsApp Enabled" checked={config.whatsappEnabled} disabled={!canManage || pending} onChange={setFlag("whatsappEnabled")} />
        <FlagRow label="Receber texto" checked={config.whatsappReceiveText} disabled={!canManage || pending} onChange={setFlag("whatsappReceiveText")} />
        <FlagRow label="Receber áudio" checked={config.whatsappReceiveAudio} disabled={!canManage || pending} onChange={setFlag("whatsappReceiveAudio")} />
        <FlagRow label="Receber imagem" checked={config.whatsappReceiveImage} disabled={!canManage || pending} onChange={setFlag("whatsappReceiveImage")} />

        <FlagRow label="OpenAI Enabled" checked={config.openAiEnabled} disabled={!canManage || pending} onChange={setFlag("openAiEnabled")} />
        <FlagRow label="Parsing de texto" checked={config.openAiTextParsing} disabled={!canManage || pending} onChange={setFlag("openAiTextParsing")} />
        <FlagRow label="Áudio (transcrição)" checked={config.openAiAudioTranscription} disabled={!canManage || pending} onChange={setFlag("openAiAudioTranscription")} />
        <FlagRow label="Imagem (visão)" checked={config.openAiImageUnderstanding} disabled={!canManage || pending} onChange={setFlag("openAiImageUnderstanding")} />

        <FlagRow label="Auto Reply" checked={config.autoReplyEnabled} disabled={!canManage || pending} onChange={setFlag("autoReplyEnabled")} />
        <FlagRow label="Memória longa" checked={config.memoryLongEnabled} disabled={!canManage || pending} onChange={setFlag("memoryLongEnabled")} />
        <FlagRow label="Multi-agente" checked={config.multiAgentEnabled} disabled={!canManage || pending} onChange={setFlag("multiAgentEnabled")} />
        <FlagRow label="Auto aprovação" checked={config.autoApprovalEnabled} disabled={!canManage || pending} onChange={setFlag("autoApprovalEnabled")} />

        <FlagRow label="Revisão manual obrigatória" checked={config.manualReviewRequired} disabled={!canManage || pending} onChange={setFlag("manualReviewRequired")} />
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/10 px-4 py-3">
        <div className="text-sm text-muted-foreground">Limite mensal de custo (centavos)</div>
        <input
          className="h-8 w-28 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          inputMode="numeric"
          value={String(config.monthlyCostLimitCents)}
          onChange={(e) => setConfig((c) => ({ ...c, monthlyCostLimitCents: Number(e.target.value || 0) }))}
          disabled={!canManage || pending}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={!canManage || pending} className="h-10 rounded-2xl">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
