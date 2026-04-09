import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ ok: false }, { status: 401 });

  const organizations = await db.membership.findMany({
    where: { userId: ctx.user.id },
    select: {
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { organization: { name: "asc" } },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    user: ctx.user,
    organization: ctx.organization,
    role: ctx.role,
    organizations: organizations.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    })),
  });
}
