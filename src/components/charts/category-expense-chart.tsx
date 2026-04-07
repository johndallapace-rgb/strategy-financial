"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Slice = {
  name: string;
  color: string;
  total: number;
};

export function CategoryExpenseChart({ data }: { data: Slice[] }) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Pie data={data} dataKey="total" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
