import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | StrateggyApp",
  description: "Política de privacidade da StrateggyApp explicando como coletamos, usamos e protegemos dados dos usuários.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Política de Privacidade – StrateggyApp</h1>
      <div className="mt-2 text-sm text-muted-foreground">
        Esta política descreve como coletamos, usamos e protegemos informações ao utilizar a StrateggyApp.
      </div>

      <div className="mt-8 space-y-8 text-sm text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">1. Introdução</h2>
          <p>
            A StrateggyApp respeita a privacidade dos usuários e adota medidas para proteger dados pessoais e informações geradas pelo uso
            da plataforma.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">2. Informações coletadas</h2>
          <p>Podemos coletar, conforme aplicável, os seguintes tipos de informações:</p>
          <p>
            - Dados fornecidos pelo usuário (como nome, e-mail e telefone) ao criar conta e configurar o perfil.
            <br />- Dados de uso da plataforma (como ações realizadas, páginas acessadas e eventos necessários para operação e suporte).
            <br />- Cookies e tecnologias semelhantes para manter sessões, melhorar a experiência e aumentar a segurança.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">3. Uso das informações</h2>
          <p>Utilizamos as informações coletadas para:</p>
          <p>
            - Operação da plataforma (autenticação, recursos, suporte e manutenção).
            <br />- Comunicação com o usuário (ex.: avisos importantes, atualizações e mensagens relacionadas ao serviço).
            <br />- Melhorias do sistema (qualidade, desempenho, confiabilidade e novas funcionalidades).
            <br />- Segurança (prevenção de fraudes, detecção de abusos e proteção contra acesso não autorizado).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">4. Compartilhamento de dados</h2>
          <p>
            Não compartilhamos dados pessoais com terceiros, exceto quando necessário para operar a plataforma ou cumprir obrigações
            legais.
          </p>
          <p>
            Exemplos incluem integrações e provedores necessários para o funcionamento (como serviços de infraestrutura e APIs de
            comunicação, incluindo Meta/WhatsApp, quando o usuário optar por ativar o recurso).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">5. Segurança</h2>
          <p>
            Aplicamos boas práticas de segurança para proteger informações, incluindo medidas técnicas e organizacionais voltadas a
            prevenir acesso não autorizado, alteração indevida, perda ou uso incorreto.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">6. Cookies</h2>
          <p>
            Utilizamos cookies e tecnologias semelhantes para manter sessões, lembrar preferências e melhorar a experiência. O usuário
            pode controlar cookies nas configurações do navegador, ciente de que certas funcionalidades podem não operar corretamente se
            forem desativados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">7. Direitos do usuário</h2>
          <p>
            O usuário pode solicitar acesso, correção e exclusão de dados pessoais, conforme aplicável. Para solicitações, entre em
            contato pelo e-mail indicado na seção “Contato”.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">8. Retenção de dados</h2>
          <p>
            Mantemos dados pelo tempo necessário para operação da plataforma, cumprimento de obrigações legais e melhoria contínua do
            serviço. Quando possível, dados podem ser anonimizados ou agregados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">9. Alterações nesta política</h2>
          <p>
            Esta política pode ser atualizada a qualquer momento para refletir melhorias, mudanças legais ou evoluções do serviço. A
            versão publicada nesta página é a versão vigente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">10. Contato</h2>
          <p>
            Para dúvidas, solicitações ou informações adicionais, entre em contato pelo e-mail{" "}
            <a className="underline underline-offset-4" href="mailto:support@strateggyapp.com">
              support@strateggyapp.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
