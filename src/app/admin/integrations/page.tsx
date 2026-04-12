import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureFlagsPanel } from "@/components/admin/feature-flags-panel";
import { WhatsappConnectPanel } from "@/components/admin/whatsapp-connect-panel";
import { requireAdmin } from "@/app/admin/actions/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isIntegrationsAllowedByPlan(plan: string) {
  return plan === "pro" || plan === "enterprise";
}

export default async function AdminIntegrationsPage() {
  const auth = await requireAdmin();
  const selectedOrgId = auth.organization.id;

  const [sub, config, whatsappConn] = await Promise.all([
    db.subscription.findUnique({
      where: { organizationId: selectedOrgId },
      select: { plan: true, status: true, cancelAtPeriodEnd: true, currentPeriodEnd: true },
    }),
    db.organizationFeatureConfig.upsert({
      where: { organizationId: selectedOrgId },
      create: { organizationId: selectedOrgId },
      update: {},
    }),
    db.integrationConnection.findUnique({
      where: { organizationId_type: { organizationId: selectedOrgId, type: "whatsapp" } },
      select: { status: true, whatsappPhoneNumberId: true, whatsappBusinessAccountId: true },
    }),
  ]);

  const plan = sub?.plan ?? "free";
  const integrationsAllowed = isIntegrationsAllowedByPlan(plan);
  const lockedReason = integrationsAllowed
    ? null
    : "Conectar seu próprio WhatsApp e habilitar OpenAI está disponível apenas no plano Completo. No Basic/Starter, use o WhatsApp da plataforma.";

  const openAiEnabled = integrationsAllowed && Boolean(process.env.OPENAI_API_KEY) && config.openAiEnabled;
  const openAiModel = process.env.OPENAI_MODEL_TEXT || "gpt-4o-mini";
  const now = new Date();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [lastWhatsapp, lastAi, lastAiError, aiCost30d] = await Promise.all([
    db.whatsappMessage.findFirst({
      where: { organizationId: selectedOrgId },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true, processedAt: true },
    }),
    db.aiExtraction.findFirst({
      where: { organizationId: selectedOrgId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true, model: true, costCents: true },
    }),
    db.aiExtraction.findFirst({
      where: { organizationId: selectedOrgId, status: "failed" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, error: true, kind: true },
    }),
    db.aiExtraction.aggregate({
      where: { organizationId: selectedOrgId, createdAt: { gte: last30d } },
      _sum: { costCents: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-xl font-semibold tracking-tight text-foreground">Integrações</div>
        <div className="text-sm text-muted-foreground">
          Organização atual: <span className="font-medium text-foreground">{auth.organization.name}</span> • Plano:{" "}
          <span className="font-mono text-xs text-foreground">{plan}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <WhatsappConnectPanel
              connected={whatsappConn?.status === "active" && Boolean(whatsappConn?.whatsappPhoneNumberId)}
              phoneNumberId={whatsappConn?.whatsappPhoneNumberId ?? null}
              businessAccountId={whatsappConn?.whatsappBusinessAccountId ?? null}
              disabled={!integrationsAllowed}
              disabledReason={lockedReason}
            />

            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Última mensagem</div>
              <div className="text-xs text-muted-foreground">
                {lastWhatsapp?.receivedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(lastWhatsapp.receivedAt) : "—"}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Webhook: <span className="font-mono">/api/whatsapp/webhook</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/30 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">OpenAI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium text-foreground">{openAiEnabled ? "Ativo" : "Inativo"}</div>
            </div>
            {!integrationsAllowed ? <div className="text-xs text-muted-foreground">{lockedReason}</div> : null}
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Modelo atual</div>
              <div className="font-mono text-xs text-foreground">{openAiModel}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Última execução</div>
              <div className="text-xs text-muted-foreground">
                {lastAi?.createdAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(lastAi.createdAt) : "—"}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Último erro</div>
              <div className="text-xs text-muted-foreground">{lastAiError?.createdAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(lastAiError.createdAt) : "—"}</div>
            </div>
            {lastAiError?.error ? <div className="line-clamp-2 text-xs text-muted-foreground">{lastAiError.error}</div> : null}
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground">Custo estimado (30d)</div>
              <div className="font-mono text-xs text-foreground">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((aiCost30d._sum.costCents ?? 0) / 100)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Chaves não são exibidas neste painel.</div>
          </CardContent>
        </Card>
      </div>

      <FeatureFlagsPanel
        canManage={integrationsAllowed}
        lockedReason={lockedReason}
        initialConfig={{
          whatsappEnabled: config.whatsappEnabled,
          whatsappReceiveText: config.whatsappReceiveText,
          whatsappReceiveAudio: config.whatsappReceiveAudio,
          whatsappReceiveImage: config.whatsappReceiveImage,
          openAiEnabled: config.openAiEnabled,
          openAiTextParsing: config.openAiTextParsing,
          openAiAudioTranscription: config.openAiAudioTranscription,
          openAiImageUnderstanding: config.openAiImageUnderstanding,
          autoReplyEnabled: config.autoReplyEnabled,
          memoryLongEnabled: config.memoryLongEnabled,
          multiAgentEnabled: config.multiAgentEnabled,
          manualReviewRequired: config.manualReviewRequired,
          autoApprovalEnabled: config.autoApprovalEnabled,
          monthlyCostLimitCents: config.monthlyCostLimitCents,
        }}
      />
    </div>
  );
}
