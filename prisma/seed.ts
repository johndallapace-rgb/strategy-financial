import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("Missing DIRECT_URL/DATABASE_URL.");

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEFAULT_COST_CENTERS = ["Pessoal", "Empresa", "Administrativo", "Comercial"] as const;

const CENTRAL_NUMBERS: Array<{ countryCode: string; phoneNumberId: string | null }> = [
  { countryCode: "BR", phoneNumberId: process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID_BR ?? null },
  { countryCode: "US", phoneNumberId: process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID_US ?? null },
  { countryCode: "ES", phoneNumberId: process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID_ES ?? null },
  { countryCode: "DE", phoneNumberId: process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID_DE ?? null },
];

const DEFAULT_CATEGORIES = [
  { type: "expense", name: "Alimentação", color: "#22c55e", icon: "shopping-basket" },
  { type: "expense", name: "Transporte", color: "#3b82f6", icon: "fuel" },
  { type: "expense", name: "Saúde", color: "#ef4444", icon: "heart-handshake" },
  { type: "expense", name: "Moradia", color: "#f59e0b", icon: "home" },
  { type: "expense", name: "Contas", color: "#f97316", icon: "zap" },
  { type: "expense", name: "Educação", color: "#8b5cf6", icon: "graduation-cap" },
  { type: "expense", name: "Lazer", color: "#ec4899", icon: "phone" },
  { type: "expense", name: "Impostos", color: "#334155", icon: "banknote" },
  { type: "expense", name: "Salários", color: "#6366f1", icon: "banknote" },
  { type: "expense", name: "Fornecedores", color: "#06b6d4", icon: "package" },
  { type: "expense", name: "Marketing", color: "#d946ef", icon: "trending-up" },
  { type: "expense", name: "Tecnologia", color: "#1d4ed8", icon: "wifi" },
  { type: "expense", name: "Manutenção", color: "#a16207", icon: "droplet" },
  { type: "expense", name: "Serviços", color: "#14b8a6", icon: "users" },
  { type: "expense", name: "Assinaturas", color: "#7c3aed", icon: "wifi" },
  { type: "expense", name: "Outros", color: "#64748b", icon: "tag" },
  { type: "income", name: "Vendas", color: "#16a34a", icon: "trending-up" },
  { type: "income", name: "Serviços", color: "#3b82f6", icon: "users" },
  { type: "income", name: "Comissões", color: "#eab308", icon: "banknote" },
  { type: "income", name: "Reembolsos", color: "#14b8a6", icon: "droplet" },
  { type: "income", name: "Investimentos", color: "#6d28d9", icon: "trending-up" },
  { type: "income", name: "Receitas diversas", color: "#64748b", icon: "banknote" },
  { type: "income", name: "Outros", color: "#94a3b8", icon: "tag" },
] as const;

const DEFAULT_SUBCATEGORIES = [
  { categoryType: "expense", categoryName: "Alimentação", name: "Mercado" },
  { categoryType: "expense", categoryName: "Alimentação", name: "Restaurante" },
  { categoryType: "expense", categoryName: "Alimentação", name: "Ifood" },
  { categoryType: "expense", categoryName: "Alimentação", name: "Padaria" },
  { categoryType: "expense", categoryName: "Alimentação", name: "Lanche" },
  { categoryType: "expense", categoryName: "Alimentação", name: "Cafeteria" },
  { categoryType: "expense", categoryName: "Transporte", name: "Uber" },
  { categoryType: "expense", categoryName: "Transporte", name: "Táxi" },
  { categoryType: "expense", categoryName: "Transporte", name: "Combustível" },
  { categoryType: "expense", categoryName: "Transporte", name: "Estacionamento" },
  { categoryType: "expense", categoryName: "Transporte", name: "Pedágio" },
  { categoryType: "expense", categoryName: "Transporte", name: "Manutenção veículo" },
  { categoryType: "expense", categoryName: "Saúde", name: "Médico" },
  { categoryType: "expense", categoryName: "Saúde", name: "Farmácia" },
  { categoryType: "expense", categoryName: "Saúde", name: "Exames" },
  { categoryType: "expense", categoryName: "Saúde", name: "Plano de saúde" },
  { categoryType: "expense", categoryName: "Saúde", name: "Odontologia" },
  { categoryType: "expense", categoryName: "Saúde", name: "Terapia" },
  { categoryType: "expense", categoryName: "Moradia", name: "Aluguel" },
  { categoryType: "expense", categoryName: "Moradia", name: "Condomínio" },
  { categoryType: "expense", categoryName: "Moradia", name: "Energia" },
  { categoryType: "expense", categoryName: "Moradia", name: "Água" },
  { categoryType: "expense", categoryName: "Moradia", name: "Internet" },
  { categoryType: "expense", categoryName: "Moradia", name: "Gás" },
  { categoryType: "expense", categoryName: "Contas", name: "Telefone" },
  { categoryType: "expense", categoryName: "Contas", name: "Internet" },
  { categoryType: "expense", categoryName: "Contas", name: "Luz" },
  { categoryType: "expense", categoryName: "Contas", name: "Água" },
  { categoryType: "expense", categoryName: "Contas", name: "Streaming" },
  { categoryType: "expense", categoryName: "Contas", name: "Seguros" },
  { categoryType: "expense", categoryName: "Educação", name: "Escola" },
  { categoryType: "expense", categoryName: "Educação", name: "Faculdade" },
  { categoryType: "expense", categoryName: "Educação", name: "Curso" },
  { categoryType: "expense", categoryName: "Educação", name: "Livros" },
  { categoryType: "expense", categoryName: "Educação", name: "Material escolar" },
  { categoryType: "expense", categoryName: "Lazer", name: "Viagem" },
  { categoryType: "expense", categoryName: "Lazer", name: "Cinema" },
  { categoryType: "expense", categoryName: "Lazer", name: "Eventos" },
  { categoryType: "expense", categoryName: "Lazer", name: "Assinaturas de lazer" },
  { categoryType: "expense", categoryName: "Lazer", name: "Passeios" },
  { categoryType: "expense", categoryName: "Impostos", name: "DAS" },
  { categoryType: "expense", categoryName: "Impostos", name: "INSS" },
  { categoryType: "expense", categoryName: "Impostos", name: "ISS" },
  { categoryType: "expense", categoryName: "Impostos", name: "IRPJ" },
  { categoryType: "expense", categoryName: "Impostos", name: "Contabilidade fiscal" },
  { categoryType: "expense", categoryName: "Salários", name: "Pró-labore" },
  { categoryType: "expense", categoryName: "Salários", name: "Folha de pagamento" },
  { categoryType: "expense", categoryName: "Salários", name: "Benefícios" },
  { categoryType: "expense", categoryName: "Salários", name: "Encargos" },
  { categoryType: "expense", categoryName: "Fornecedores", name: "Matéria-prima" },
  { categoryType: "expense", categoryName: "Fornecedores", name: "Mercadorias" },
  { categoryType: "expense", categoryName: "Fornecedores", name: "Insumos" },
  { categoryType: "expense", categoryName: "Fornecedores", name: "Terceirizados" },
  { categoryType: "expense", categoryName: "Marketing", name: "Tráfego pago" },
  { categoryType: "expense", categoryName: "Marketing", name: "Designer" },
  { categoryType: "expense", categoryName: "Marketing", name: "Ferramentas" },
  { categoryType: "expense", categoryName: "Marketing", name: "Agência" },
  { categoryType: "expense", categoryName: "Marketing", name: "Domínio e hospedagem" },
  { categoryType: "expense", categoryName: "Tecnologia", name: "Software" },
  { categoryType: "expense", categoryName: "Tecnologia", name: "SaaS" },
  { categoryType: "expense", categoryName: "Tecnologia", name: "Equipamentos" },
  { categoryType: "expense", categoryName: "Tecnologia", name: "Licenças" },
  { categoryType: "expense", categoryName: "Tecnologia", name: "Desenvolvimento" },
  { categoryType: "expense", categoryName: "Manutenção", name: "Equipamentos" },
  { categoryType: "expense", categoryName: "Manutenção", name: "Reformas" },
  { categoryType: "expense", categoryName: "Manutenção", name: "Reparos" },
  { categoryType: "expense", categoryName: "Manutenção", name: "Limpeza técnica" },
  { categoryType: "expense", categoryName: "Serviços", name: "Consultoria" },
  { categoryType: "expense", categoryName: "Serviços", name: "Jurídico" },
  { categoryType: "expense", categoryName: "Serviços", name: "Contábil" },
  { categoryType: "expense", categoryName: "Serviços", name: "Freelancer" },
  { categoryType: "expense", categoryName: "Serviços", name: "Prestadores" },
  { categoryType: "expense", categoryName: "Assinaturas", name: "Netflix" },
  { categoryType: "expense", categoryName: "Assinaturas", name: "Spotify" },
  { categoryType: "expense", categoryName: "Assinaturas", name: "ChatGPT" },
  { categoryType: "expense", categoryName: "Assinaturas", name: "Ferramentas online" },
  { categoryType: "expense", categoryName: "Assinaturas", name: "Plataformas" },
  { categoryType: "expense", categoryName: "Outros", name: "Diversos" },
  { categoryType: "expense", categoryName: "Outros", name: "Não classificado" },
  { categoryType: "income", categoryName: "Vendas", name: "Venda à vista" },
  { categoryType: "income", categoryName: "Vendas", name: "Venda parcelada" },
  { categoryType: "income", categoryName: "Vendas", name: "Venda online" },
  { categoryType: "income", categoryName: "Vendas", name: "Venda balcão" },
  { categoryType: "income", categoryName: "Serviços", name: "Serviço avulso" },
  { categoryType: "income", categoryName: "Serviços", name: "Contrato mensal" },
  { categoryType: "income", categoryName: "Serviços", name: "Projeto fechado" },
  { categoryType: "income", categoryName: "Comissões", name: "Comissão de vendas" },
  { categoryType: "income", categoryName: "Comissões", name: "Comissão de parceiros" },
  { categoryType: "income", categoryName: "Reembolsos", name: "Reembolso cliente" },
  { categoryType: "income", categoryName: "Reembolsos", name: "Reembolso fornecedor" },
  { categoryType: "income", categoryName: "Investimentos", name: "Rendimentos" },
  { categoryType: "income", categoryName: "Investimentos", name: "Aplicações" },
  { categoryType: "income", categoryName: "Investimentos", name: "Resgates" },
  { categoryType: "income", categoryName: "Receitas diversas", name: "Receita eventual" },
  { categoryType: "income", categoryName: "Receitas diversas", name: "Entrada não operacional" },
  { categoryType: "income", categoryName: "Outros", name: "Diversos" },
  { categoryType: "income", categoryName: "Outros", name: "Não classificado" },
] as const;

async function ensureDefaultFinanceForOrganization(organizationId: string) {
  const wallet = await prisma.account.findFirst({
    where: { organizationId, name: "Carteira" },
    select: { id: true },
  });

  if (!wallet) {
    await prisma.account.create({
      data: { organizationId, name: "Carteira", type: "pf", isSystemDefault: true },
      select: { id: true },
    });
  } else {
    await prisma.account.updateMany({
      where: { organizationId, name: "Carteira" },
      data: { isSystemDefault: true },
    });
  }

  await prisma.costCenter.createMany({
    data: DEFAULT_COST_CENTERS.map((name) => ({ organizationId, name, isSystemDefault: true })),
    skipDuplicates: true,
  });

  await prisma.costCenter.updateMany({
    where: { organizationId, name: { in: [...DEFAULT_COST_CENTERS] } },
    data: { isSystemDefault: true },
  });

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, organizationId, isSystemDefault: true })),
    skipDuplicates: true,
  });

  await prisma.category.updateMany({
    where: {
      organizationId,
      OR: DEFAULT_CATEGORIES.map((c) => ({ name: c.name, type: c.type })),
    },
    data: { isSystemDefault: true },
  });

  const categories = await prisma.category.findMany({
    where: { organizationId },
    select: { id: true, type: true, name: true },
  });

  const byKey = new Map(categories.map((c) => [`${c.type}:${c.name}`, c.id] as const));
  const subData = DEFAULT_SUBCATEGORIES.map((s) => {
    const categoryId = byKey.get(`${s.categoryType}:${s.categoryName}`);
    return categoryId ? { organizationId, categoryId, name: s.name, isSystemDefault: true } : null;
  }).filter(Boolean) as Array<{ organizationId: string; categoryId: string; name: string; isSystemDefault: boolean }>;

  if (subData.length > 0) {
    await prisma.subcategory.createMany({ data: subData, skipDuplicates: true });
    await prisma.subcategory.updateMany({
      where: {
        organizationId,
        OR: subData.map((s) => ({ categoryId: s.categoryId, name: s.name })),
      },
      data: { isSystemDefault: true },
    });
  }
}

async function main() {
  for (const c of CENTRAL_NUMBERS) {
    if (!c.phoneNumberId || c.phoneNumberId.trim().length === 0) continue;
    await prisma.whatsappCentralNumber.upsert({
      where: { countryCode: c.countryCode },
      create: { countryCode: c.countryCode, phoneNumberId: c.phoneNumberId.trim(), active: true },
      update: { phoneNumberId: c.phoneNumberId.trim(), active: true },
    });
  }

  const orgs = await prisma.organization.findMany({ select: { id: true } });
  for (const org of orgs) {
    await ensureDefaultFinanceForOrganization(org.id);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
