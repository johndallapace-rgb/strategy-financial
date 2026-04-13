import { requireAuthContext } from "@/lib/auth";
import { WhatsappIntegrationCard } from "@/components/settings/whatsapp-integration-card";
import { EnterpriseCredentialsCard } from "@/components/settings/enterprise-credentials-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsIntegrationsPage() {
  await requireAuthContext();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xl font-semibold tracking-tight text-foreground">Integrações</div>
        <div className="text-sm text-muted-foreground">
          Conecte seus canais para automatizar seus lançamentos. No plano Basic, o vínculo do WhatsApp é criado automaticamente ao enviar a primeira mensagem para o número central.
        </div>
      </div>

      <WhatsappIntegrationCard />
      <EnterpriseCredentialsCard />
    </div>
  );
}
