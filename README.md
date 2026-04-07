# Strategy Financial

Aplicativo financeiro full stack para controle de receitas e despesas (PF/PJ), com dashboard inteligente, alertas e estrutura pronta para evoluir com integrações (ex: WhatsApp).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM + PostgreSQL
- Recharts (gráficos)
- Deploy: Vercel

## Setup local

1) Crie um banco PostgreSQL e configure as URLs de conexão no `.env`:

```bash
# URL de connection pool (usada pela aplicação em runtime)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"

# URL direta (usada para rodar migrações do banco de dados)
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
```

2) Rode migrações e seeds:

```bash
npm run prisma:migrate
npm run db:seed
```

3) Suba o projeto:

```bash
npm run dev
```

## Seeds iniciais

- Contas: Conta PF, Conta PJ
- Categorias padrão: Mercado, Aluguel, Energia, Internet, Funcionário, Telefone, Combustível, Escola, Convênio, Produtos, Água, Receita Operacional, Receita Variável
- Regras de alerta: 80% (PF e PJ)

## Deploy na Vercel

- Configure as variáveis `DATABASE_URL` e `DIRECT_URL` no projeto Vercel.
- Aplique migrações no banco (CI/CD ou manualmente via Prisma CLI).
- O build já executa `prisma generate` via `postinstall` no `package.json`.
