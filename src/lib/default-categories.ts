import { db } from "@/lib/db";

type DefaultCategory = {
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  isSystemDefault: boolean;
};

type DefaultSubcategory = {
  categoryType: "income" | "expense";
  categoryName: string;
  name: string;
  isSystemDefault: boolean;
};

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { type: "expense", name: "Alimentação", color: "#22c55e", icon: "shopping-basket", isSystemDefault: true },
  { type: "expense", name: "Transporte", color: "#3b82f6", icon: "fuel", isSystemDefault: true },
  { type: "expense", name: "Saúde", color: "#ef4444", icon: "heart-handshake", isSystemDefault: true },
  { type: "expense", name: "Moradia", color: "#f59e0b", icon: "home", isSystemDefault: true },
  { type: "expense", name: "Contas", color: "#f97316", icon: "zap", isSystemDefault: true },
  { type: "expense", name: "Educação", color: "#8b5cf6", icon: "graduation-cap", isSystemDefault: true },
  { type: "expense", name: "Lazer", color: "#ec4899", icon: "phone", isSystemDefault: true },
  { type: "expense", name: "Impostos", color: "#334155", icon: "banknote", isSystemDefault: true },
  { type: "expense", name: "Salários", color: "#6366f1", icon: "banknote", isSystemDefault: true },
  { type: "expense", name: "Fornecedores", color: "#06b6d4", icon: "package", isSystemDefault: true },
  { type: "expense", name: "Marketing", color: "#d946ef", icon: "trending-up", isSystemDefault: true },
  { type: "expense", name: "Tecnologia", color: "#1d4ed8", icon: "wifi", isSystemDefault: true },
  { type: "expense", name: "Manutenção", color: "#a16207", icon: "droplet", isSystemDefault: true },
  { type: "expense", name: "Serviços", color: "#14b8a6", icon: "users", isSystemDefault: true },
  { type: "expense", name: "Assinaturas", color: "#7c3aed", icon: "wifi", isSystemDefault: true },
  { type: "expense", name: "Outros", color: "#64748b", icon: "tag", isSystemDefault: true },

  { type: "income", name: "Vendas", color: "#16a34a", icon: "trending-up", isSystemDefault: true },
  { type: "income", name: "Serviços", color: "#3b82f6", icon: "users", isSystemDefault: true },
  { type: "income", name: "Comissões", color: "#eab308", icon: "banknote", isSystemDefault: true },
  { type: "income", name: "Reembolsos", color: "#14b8a6", icon: "droplet", isSystemDefault: true },
  { type: "income", name: "Investimentos", color: "#6d28d9", icon: "trending-up", isSystemDefault: true },
  { type: "income", name: "Receitas diversas", color: "#64748b", icon: "banknote", isSystemDefault: true },
  { type: "income", name: "Outros", color: "#94a3b8", icon: "tag", isSystemDefault: true },
];

const DEFAULT_SUBCATEGORIES: DefaultSubcategory[] = [
  { categoryType: "expense", categoryName: "Alimentação", name: "Mercado", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Alimentação", name: "Restaurante", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Alimentação", name: "Ifood", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Alimentação", name: "Padaria", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Alimentação", name: "Lanche", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Alimentação", name: "Cafeteria", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Transporte", name: "Uber", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Transporte", name: "Táxi", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Transporte", name: "Combustível", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Transporte", name: "Estacionamento", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Transporte", name: "Pedágio", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Transporte", name: "Manutenção veículo", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Saúde", name: "Médico", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Saúde", name: "Farmácia", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Saúde", name: "Exames", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Saúde", name: "Plano de saúde", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Saúde", name: "Odontologia", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Saúde", name: "Terapia", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Moradia", name: "Aluguel", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Moradia", name: "Condomínio", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Moradia", name: "Energia", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Moradia", name: "Água", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Moradia", name: "Internet", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Moradia", name: "Gás", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Contas", name: "Telefone", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Contas", name: "Internet", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Contas", name: "Luz", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Contas", name: "Água", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Contas", name: "Streaming", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Contas", name: "Seguros", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Educação", name: "Escola", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Educação", name: "Faculdade", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Educação", name: "Curso", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Educação", name: "Livros", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Educação", name: "Material escolar", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Lazer", name: "Viagem", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Lazer", name: "Cinema", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Lazer", name: "Eventos", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Lazer", name: "Assinaturas de lazer", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Lazer", name: "Passeios", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Impostos", name: "DAS", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Impostos", name: "INSS", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Impostos", name: "ISS", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Impostos", name: "IRPJ", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Impostos", name: "Contabilidade fiscal", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Salários", name: "Pró-labore", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Salários", name: "Folha de pagamento", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Salários", name: "Benefícios", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Salários", name: "Encargos", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Fornecedores", name: "Matéria-prima", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Fornecedores", name: "Mercadorias", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Fornecedores", name: "Insumos", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Fornecedores", name: "Terceirizados", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Marketing", name: "Tráfego pago", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Marketing", name: "Designer", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Marketing", name: "Ferramentas", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Marketing", name: "Agência", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Marketing", name: "Domínio e hospedagem", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Tecnologia", name: "Software", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Tecnologia", name: "SaaS", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Tecnologia", name: "Equipamentos", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Tecnologia", name: "Licenças", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Tecnologia", name: "Desenvolvimento", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Manutenção", name: "Equipamentos", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Manutenção", name: "Reformas", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Manutenção", name: "Reparos", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Manutenção", name: "Limpeza técnica", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Serviços", name: "Consultoria", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Serviços", name: "Jurídico", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Serviços", name: "Contábil", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Serviços", name: "Freelancer", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Serviços", name: "Prestadores", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Assinaturas", name: "Netflix", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Assinaturas", name: "Spotify", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Assinaturas", name: "ChatGPT", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Assinaturas", name: "Ferramentas online", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Assinaturas", name: "Plataformas", isSystemDefault: true },

  { categoryType: "expense", categoryName: "Outros", name: "Diversos", isSystemDefault: true },
  { categoryType: "expense", categoryName: "Outros", name: "Não classificado", isSystemDefault: true },

  { categoryType: "income", categoryName: "Vendas", name: "Venda à vista", isSystemDefault: true },
  { categoryType: "income", categoryName: "Vendas", name: "Venda parcelada", isSystemDefault: true },
  { categoryType: "income", categoryName: "Vendas", name: "Venda online", isSystemDefault: true },
  { categoryType: "income", categoryName: "Vendas", name: "Venda balcão", isSystemDefault: true },

  { categoryType: "income", categoryName: "Serviços", name: "Serviço avulso", isSystemDefault: true },
  { categoryType: "income", categoryName: "Serviços", name: "Contrato mensal", isSystemDefault: true },
  { categoryType: "income", categoryName: "Serviços", name: "Projeto fechado", isSystemDefault: true },

  { categoryType: "income", categoryName: "Comissões", name: "Comissão de vendas", isSystemDefault: true },
  { categoryType: "income", categoryName: "Comissões", name: "Comissão de parceiros", isSystemDefault: true },

  { categoryType: "income", categoryName: "Reembolsos", name: "Reembolso cliente", isSystemDefault: true },
  { categoryType: "income", categoryName: "Reembolsos", name: "Reembolso fornecedor", isSystemDefault: true },

  { categoryType: "income", categoryName: "Investimentos", name: "Rendimentos", isSystemDefault: true },
  { categoryType: "income", categoryName: "Investimentos", name: "Aplicações", isSystemDefault: true },
  { categoryType: "income", categoryName: "Investimentos", name: "Resgates", isSystemDefault: true },

  { categoryType: "income", categoryName: "Receitas diversas", name: "Receita eventual", isSystemDefault: true },
  { categoryType: "income", categoryName: "Receitas diversas", name: "Entrada não operacional", isSystemDefault: true },

  { categoryType: "income", categoryName: "Outros", name: "Diversos", isSystemDefault: true },
  { categoryType: "income", categoryName: "Outros", name: "Não classificado", isSystemDefault: true },
];

export async function seedDefaultCategoriesForOrganization(organizationId: string) {
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, organizationId })),
    skipDuplicates: true,
  });

  await db.category.updateMany({
    where: {
      organizationId,
      OR: DEFAULT_CATEGORIES.map((c) => ({ name: c.name, type: c.type })),
    },
    data: { isSystemDefault: true },
  });

  const categories = await db.category.findMany({
    where: { organizationId },
    select: { id: true, type: true, name: true },
  });
  const byKey = new Map(categories.map((c) => [`${c.type}:${c.name}`, c.id] as const));
  const data = DEFAULT_SUBCATEGORIES.map((s) => {
    const categoryId = byKey.get(`${s.categoryType}:${s.categoryName}`);
    return categoryId ? { organizationId, categoryId, name: s.name, isSystemDefault: s.isSystemDefault } : null;
  }).filter(Boolean) as Array<{ organizationId: string; categoryId: string; name: string; isSystemDefault: boolean }>;

  if (data.length > 0) {
    await db.subcategory.createMany({ data, skipDuplicates: true });
  }

  if (data.length > 0) {
    await db.subcategory.updateMany({
      where: {
        organizationId,
        OR: data.map((s) => ({ categoryId: s.categoryId, name: s.name })),
      },
      data: { isSystemDefault: true },
    });
  }
}

export function listDefaultCategories() {
  return DEFAULT_CATEGORIES.slice();
}

export function listDefaultSubcategories() {
  return DEFAULT_SUBCATEGORIES.slice();
}
