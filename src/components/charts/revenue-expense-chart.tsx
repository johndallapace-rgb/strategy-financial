"use client";

import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

type Point = {
  date: string;
  income: number;
  expense: number;
};

export function RevenueExpenseChart({ data }: { data: Point[] }) {
  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const formatAxis = (value: number) =>
    new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.18} vertical={false} />
          <XAxis
            dataKey="date"
            tickMargin={8}
            minTickGap={24}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))", opacity: 0.6 }}
            tickLine={{ stroke: "hsl(var(--border))", opacity: 0.4 }}
            tickFormatter={(value) =>
              typeof value === "string" && value.length >= 10 ? `${value.slice(8, 10)}/${value.slice(5, 7)}` : value
            }
          />
          <YAxis
            tickMargin={8}
            width={56}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))", opacity: 0.6 }}
            tickLine={{ stroke: "hsl(var(--border))", opacity: 0.4 }}
            tickFormatter={(v) => formatAxis(Number(v))}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(label) => `Data: ${label}`}
            cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, opacity: 0.7 }}
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
          <Line type="monotone" dataKey="income" stroke="#22C55E" strokeWidth={2.2} dot={false} activeDot={{ r: 3 }} />
          <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2.2} dot={false} activeDot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
