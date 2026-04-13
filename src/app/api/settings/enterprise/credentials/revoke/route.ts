import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function requireEnterpriseAdmin(role: "owner" | "admin" | "member") {
  if (role === "member") throw new Error("forbidden");
}

function shouldLog() {
  return process.env.ENTERPRISE_CREDENTIALS_DEBUG === "1" || process.env.TENANT_DEBUG === "1";
}

const bodySchema = z.object({
  credentialId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const auth = await requireAuthContext();
    requireEnterpriseAdmin(auth.role);

    const body = bodySchema.parse(await req.json().catch(() => ({})));

    const result = await db.apiCredential.updateMany({
      where: { id: body.credentialId, organizationId: auth.organization.id, status: "active" },
      data: { status: "disabled" },
    });

    if (result.count === 0) {
      if (shouldLog()) {
        const crossTenant = await db.apiCredential.findFirst({
          where: { id: body.credentialId, organizationId: { not: auth.organization.id } },
          select: { id: true, organizationId: true },
        });
        console.log("[ENTERPRISE_CREDENTIALS]", {
          action: "revoke",
          organizationId: auth.organization.id,
          userId: auth.user.id,
          credentialId: body.credentialId,
          allow: false,
          reason: crossTenant ? "cross_tenant" : "not_found_or_already_disabled",
        });
      }
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    await db.adminAuditLog.create({
      data: {
        organizationId: auth.organization.id,
        actorUserId: auth.user.id,
        action: "enterprise.credentials.revoke",
        data: { credentialId: body.credentialId },
      },
      select: { id: true },
    });

    if (shouldLog()) {
      console.log("[ENTERPRISE_CREDENTIALS]", {
        action: "revoke",
        organizationId: auth.organization.id,
        userId: auth.user.id,
        credentialId: body.credentialId,
        allow: true,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (shouldLog()) {
      console.log("[ENTERPRISE_CREDENTIALS]", { action: "revoke", allow: false, reason: err instanceof Error ? err.message : "unknown" });
    }
    if (err instanceof Error && err.message === "forbidden") return NextResponse.json({ ok: false }, { status: 403 });
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
