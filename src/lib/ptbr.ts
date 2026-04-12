const categoryNameMap: Record<string, string> = {
  Market: "Mercado",
  Rent: "Aluguel",
  Energy: "Energia",
  Internet: "Internet",
  Employee: "Funcionário",
  Phone: "Telefone",
  Fuel: "Combustível",
  School: "Escola",
  "Health Insurance": "Convênio",
  Products: "Produtos",
  Water: "Água",
  "Operational Revenue": "Receita Operacional",
  "Variable Revenue": "Receita Variável",
};

const sourceNameMap: Record<string, string> = {
  Housing: "Moradia",
  Office: "Escritório",
  Payroll: "Folha",
  Supplier: "Fornecedor",
  Insurance: "Seguradora",
  Supermarket: "Supermercado",
};

export function displayCategoryName(name: string) {
  return categoryNameMap[name] ?? name;
}

export function displaySourceName(source: string) {
  return sourceNameMap[source] ?? source;
}

export function displayAccountName(name: string) {
  return name.replace(/\s*\((pf|pj)\)\s*/gi, "").trim();
}
