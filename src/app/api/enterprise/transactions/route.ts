import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireEnterpriseAuth } from "@/lib/enterprise/auth";

export const runtime = "nodejs";

function toDateOnly(input: string) {
  const parts = input.split("-");
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional(),
  source: z.string().trim().min(2).max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireEnterpriseAuth(req, "transactions:write");
    const body = bodySchema.parse(await req.json().catch(() => ({})));

    const category = await db.category.findFirst({
      where: { id: body.categoryId, organizationId: auth.organizationId },
      select: { id: true },
    });
    if (!category) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });

    let subcategoryId: string | null = body.subcategoryId ?? null;
    if (subcategoryId) {
      const sub = await db.subcategory.findFirst({
        where: { id: subcategoryId, organizationId: auth.organizationId, categoryId: body.categoryId },
        select: { id: true },
      });
      if (!sub) return NextResponse.json({ error: "Subcategoria inválida." }, { status: 400 });
    }

    let accountId: string | null = body.accountId ?? null;
    if (accountId) {
      const acc = await db.account.findFirst({
        where: { id: accountId, organizationId: auth.organizationId },
        select: { id: true },
      });
      if (!acc) return NextResponse.json({ error: "Conta inválida." }, { status: 400 });
    } else {
      accountId =
        (
          await db.account.findFirst({
            where: { organizationId: auth.organizationId, name: "Carteira" },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        )?.id ??
        (
          await db.account.findFirst({
            where: { organizationId: auth.organizationId },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        )?.id ??
        null;
    }
    if (!accountId) return NextResponse.json({ error: "Cadastre uma conta antes de criar transações." }, { status: 400 });

    let costCenterId: string | null = body.costCenterId ?? null;
    if (costCenterId) {
      const cc = await db.costCenter.findFirst({
        where: { id: costCenterId, organizationId: auth.organizationId },
        select: { id: true },
      });
      if (!cc) return NextResponse.json({ error: "Centro de custo inválido." }, { status: 400 });
    }

    const dateStr = body.date ?? new Date().toISOString().slice(0, 10);
    const date = toDateOnly(dateStr);
    if (!date) return NextResponse.json({ error: "Data inválida." }, { status: 400 });

    const source = body.source ?? "enterprise";

    const created = await db.transaction.create({
      data: {
        organizationId: auth.organizationId,
        name: body.name,
        amount: new Prisma.Decimal(body.amount.toFixed(2)),
        type: body.type,
        date,
        dueDate: null,
        isFixed: false,
        isVariable: true,
        entityType: "pf",
        source,
        categoryId: body.categoryId,
        subcategoryId,
        accountId,
        costCenterId,
        notes: body.notes ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    if (err instanceof Error && err.message === "forbidden") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    if (err instanceof Error && err.message === "unauthorized") return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

