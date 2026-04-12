import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireAuthContext();

  const [cfg, drafts] = await Promise.all([
    db.organizationFeatureConfig.findUnique({
      where: { organizationId: auth.organization.id },
      select: { manualReviewRequired: true },
    }),
    db.smartDraft.findMany({
      where: { organizationId: auth.organization.id, status: "pending_review" },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        createdAt: true,
        originalText: true,
        parsed: true,
        whatsappMessage: { select: { receivedAt: true, fromNumber: true } },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    manualReviewRequired: cfg?.manualReviewRequired ?? true,
    drafts: drafts.map((d) => ({
      id: d.id,
      receivedAt: (d.whatsappMessage?.receivedAt ?? d.createdAt).toISOString(),
      from: d.whatsappMessage?.fromNumber ?? null,
      originalMessage: d.originalText ?? null,
      parsed: d.parsed ?? null,
    })),
  });
}
