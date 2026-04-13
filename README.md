# Strategy Financial

Aplicativo financeiro full stack para controle de receitas e despesas (PF/PJ), com dashboard inteligente, alertas e estrutura pronta para evoluir com integrações (ex: WhatsApp).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM + PostgreSQL
- Recharts (gráficos)
- Deploy: Vercel

## Setup local (Ambiente DEV)

1) Crie um banco PostgreSQL no Neon chamado **strategy-financial-dev**.
2) Renomeie ou copie o `.env.example` para `.env.local` e configure as URLs:

```bash
# URL de connection pool (usada pela aplicação em runtime)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/strategy_financial_dev?schema=public"

# URL direta (usada para rodar migrações do banco de dados)
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/strategy_financial_dev?schema=public"
```

3) Para garantir que está no banco certo, rode:
```bash
npm run db:info
```

4) Sincronize o schema de desenvolvimento (sempre use o comando seguro!):
```bash
npm run db:reset:dev
```
*Isso apaga o banco, recria as tabelas e roda o seed de base.*

5) Suba o projeto:
```bash
npm run dev
```

## Deploy na Vercel (Ambiente PROD)

1) Crie um banco PostgreSQL no Neon chamado **strategy-financial-prod**.
2) Na Vercel, configure as Environment Variables:
   - `DATABASE_URL` apontando para o PROD
   - `DIRECT_URL` apontando para o PROD
   - `NEXT_PUBLIC_APP_URL` = `https://app.strateggyapp.com`
3) **MUITO IMPORTANTE:** **NUNCA** execute `npm run db:reset:dev` ou `npx prisma migrate reset` apontando para o banco de produção. O deploy usará `npx prisma migrate deploy` automaticamente para aplicar apenas as alterações novas.

## Seeds e Dados Padrão

O projeto foi ajustado para **não criar dados falsos (demo) no seed**. O processo de `db:reset:dev` apenas prepara o banco vazio. Os dados padrão reais do sistema (Conta "Carteira", Centros de Custo e Categorias/Subcategorias) **nascem automaticamente na criação da conta (signup)**. Para ver o banco povoado, crie uma conta no `/signup`.

## Fundação SaaS (Auth + Multi-tenant)

- Rotas protegidas por login: todo o app exige autenticação.
- Criação de conta: `/signup` cria usuário + workspace (Organization) e inicia trial.
- Login: `/login`.
- Multi-tenant: dados financeiros são sempre escopados por `organizationId`.
- Upgrade de banco para ambiente existente: use [saas_upgrade.sql](file:///e:/STRATEGY%20FINANCIAL/finapp/prisma/saas_upgrade.sql) antes de publicar.
- Convites e membros (Equipe): aplique [invites_upgrade.sql](file:///e:/STRATEGY%20FINANCIAL/finapp/prisma/invites_upgrade.sql).
