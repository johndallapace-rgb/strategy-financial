import { Prisma } from "@prisma/client";

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function decimalToNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

export function parseMoneyToDecimal(input: string) {
  const normalized = input
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!normalized) return null;
  const asNumber = Number(normalized);
  if (!Number.isFinite(asNumber)) return null;
  if (asNumber < 0) return null;

  return new Prisma.Decimal(normalized);
}
