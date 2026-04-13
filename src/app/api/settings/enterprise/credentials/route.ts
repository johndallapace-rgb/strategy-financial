import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function sha256Base64Url(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function requireEnterpriseAdmin(role: "owner" | "admin" | "member") {
  if (role === "member") throw new Error("forbidden");
}

function shouldLog() {
  return process.env.ENTERPRISE_CREDENTIALS_DEBUG === "1" || process.env.TENANT_DEBUG === "1";
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  scopes: z.array(z.string().trim().min(2).max(80)).min(1).max(50),
});

export async function GET() {
  try {
    const auth = await requireAuthContext();
    requireEnterpriseAdmin(auth.role);

    const credentials = await db.apiCredential.findMany({
      where: { organizationId: auth.organization.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, name: true, status: true, scopes: true, createdAt: true },
    });

    if (shouldLog()) {
      console.log("[ENTERPRISE_CREDENTIALS]", {
        action: "list",
        organizationId: auth.organization.id,
        userId: auth.user.id,
        count: credentials.length,
        allow: true,
      });
    }

    return NextResponse.json({ ok: true, credentials });
  } catch (err) {
    if (shouldLog()) {
      console.log("[ENTERPRISE_CREDENTIALS]", { action: "list", allow: false, reason: err instanceof Error ? err.message : "unknown" });
    }
    if (err instanceof Error && err.message === "forbidden") return NextResponse.json({ ok: false }, { status: 403 });
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthContext();
    requireEnterpriseAdmin(auth.role);

    const body = createSchema.parse(await req.json().catch(() => ({})));
    const scopes = Array.from(new Set(body.scopes.map((s) => s.trim()).filter((s) => s.length > 0))).slice(0, 50);
    if (!scopes.length) return NextResponse.json({ ok: false, error: "scopes_required" }, { status: 400 });

    let apiKey: string | null = null;
    let created: { id: string; name: string; status: string; scopes: string[]; createdAt: Date } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      apiKey = `sf_live_${randomToken()}`;
      const apiKeyHash = sha256Base64Url(apiKey);
      try {
        created = await db.apiCredential.create({
          data: {
            organizationId: auth.organization.id,
            name: body.name,
            apiKeyHash,
            status: "active",
            scopes,
          },
          select: { id: true, name: true, status: true, scopes: true, createdAt: true },
        });
        break;
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
        apiKey = null;
      }
    }

    if (!apiKey || !created) return NextResponse.json({ ok: false }, { status: 500 });

    await db.adminAuditLog.create({
      data: {
        organizationId: auth.organization.id,
        actorUserId: auth.user.id,
        action: "enterprise.credentials.create",
        data: { credentialId: created.id, name: created.name, scopes: created.scopes, status: created.status },
      },
      select: { id: true },
    });

    if (shouldLog()) {
      console.log("[ENTERPRISE_CREDENTIALS]", {
        action: "create",
        organizationId: auth.organization.id,
        userId: auth.user.id,
        credentialId: created.id,
        allow: true,
      });
    }

    return NextResponse.json({
      ok: true,
      credential: { ...created, createdAt: created.createdAt.toISOString() },
      apiKey,
    });
  } catch (err) {
    if (shouldLog()) {
      console.log("[ENTERPRISE_CREDENTIALS]", {
        action: "create",
        allow: false,
        reason: err instanceof Error ? err.message : "unknown",
      });
    }
    if (err instanceof Error && err.message === "forbidden") return NextResponse.json({ ok: false }, { status: 403 });
    if (err instanceof z.ZodError) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
