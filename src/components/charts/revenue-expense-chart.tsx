"use client";

import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

type Point = {
  date: string;
  income: number;
  expense: number;
};

export function RevenueExpenseChart({ data }: { data: Point[] }) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="date"
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value) =>
              typeof value === "string" && value.length >= 10 ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : value
            }
          />
          <YAxis tickMargin={8} width={52} />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <Line type="monotone" dataKey="income" stroke="#22C55E" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
