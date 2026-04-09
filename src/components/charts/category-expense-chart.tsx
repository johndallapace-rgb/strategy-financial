"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Slice = {
  name: string;
  color: string;
  total: number;
};

export function CategoryExpenseChart({ data }: { data: Slice[] }) {
  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              background: "hsl(var(--popover) / 0.92)",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
              padding: "10px 12px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 6 }}
            itemStyle={{ color: "hsl(var(--muted-foreground))" }}
          />
          <Pie data={data} dataKey="total" nameKey="name" innerRadius={72} outerRadius={112} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
