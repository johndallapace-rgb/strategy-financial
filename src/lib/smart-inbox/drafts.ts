"use server";

import { db } from "@/lib/db";
import type { TextExtraction } from "@/lib/ai/text-parser";

export async function createSmartDraftFromWhatsappMessage({
  organizationId,
  whatsappMessageId,
  originalText,
  batchItemIndex,
}: {
  organizationId: string;
  whatsappMessageId: string;
  originalText: string | null;
  batchItemIndex?: number;
}) {
  const idx = typeof batchItemIndex === "number" && Number.isFinite(batchItemIndex) ? Math.max(0, Math.floor(batchItemIndex)) : 0;
  return db.smartDraft.upsert({
    where: { whatsappMessageId_batchItemIndex: { whatsappMessageId, batchItemIndex: idx } },
    create: {
      organizationId,
      whatsappMessageId,
      batchItemIndex: idx,
      status: "pending_review",
      originalText,
    },
    update: {},
  });
}

export async function applyTextExtractionToDraft({
  organizationId,
  draftId,
  extraction,
}: {
  organizationId: string;
  draftId: string;
  extraction: TextExtraction;
}) {
  await db.smartDraft.updateMany({
    where: { id: draftId, organizationId },
    data: { parsed: extraction as unknown as object },
  });
}
