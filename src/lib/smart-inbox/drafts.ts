"use server";

import { db } from "@/lib/db";
import type { TextExtraction } from "@/lib/ai/text-parser";

export async function createSmartDraftFromWhatsappMessage({
  organizationId,
  whatsappMessageId,
  originalText,
}: {
  organizationId: string;
  whatsappMessageId: string;
  originalText: string | null;
}) {
  return db.smartDraft.upsert({
    where: { whatsappMessageId },
    create: {
      organizationId,
      whatsappMessageId,
      status: "pending_review",
      originalText,
    },
    update: {},
  });
}

export async function applyTextExtractionToDraft({
  draftId,
  extraction,
}: {
  draftId: string;
  extraction: TextExtraction;
}) {
  return db.smartDraft.update({
    where: { id: draftId },
    data: {
      parsed: extraction as unknown as object,
    },
  });
}
