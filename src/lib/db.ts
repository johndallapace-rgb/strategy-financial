import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pgPool?: Pool };

function normalizePgConnectionString(input: string | undefined) {
  const cs = (input ?? "").trim();
  if (!cs) return cs;
  if (process.env.NODE_ENV === "production") return cs;

  try {
    const url = new URL(cs);
    const sslmode = url.searchParams.get("sslmode");
    if (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {}

  return cs;
}

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: normalizePgConnectionString(process.env.DATABASE_URL),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pgPool = pool;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
