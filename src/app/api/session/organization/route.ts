import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthContext, getSessionTokenHashFromCookies } from "@/lib/auth";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ ok: false }, { status: 401 });

  const tokenHash = await getSessionTokenHashFromCookies();
  if (!tokenHash) return NextResponse.json({ ok: false }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { organizationId } = parsed.data;

  if (organizationId === ctx.organization.id) return NextResponse.json({ ok: true });

  const allowed = await db.membership.count({
    where: { userId: ctx.user.id, organizationId },
  });
  if (!allowed) return NextResponse.json({ ok: false }, { status: 403 });

  await db.session.updateMany({
    where: { tokenHash },
    data: { organizationId },
  });

  return NextResponse.json({ ok: true });
}

