"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";

const discardSchema = z.object({ draftId: z.string().uuid() });
const approvalSchema = z.object({ manualReviewRequired: z.boolean() });

export async function discardSmartDraftAction(input: z.input<typeof discardSchema>) {
  const auth = await requireAuthContext();
  const { draftId } = discardSchema.parse(input);

  await db.smartDraft.updateMany({
    where: { id: draftId, organizationId: auth.organization.id, status: "pending_review" },
    data: { status: "discarded" },
  });

  revalidatePath("/inbox");
}

export async function setInboxApprovalModeAction(input: z.input<typeof approvalSchema>) {
  const auth = await requireAuthContext();
  const { manualReviewRequired } = approvalSchema.parse(input);

  await db.organizationFeatureConfig.upsert({
    where: { organizationId: auth.organization.id },
    create: {
      organizationId: auth.organization.id,
      manualReviewRequired,
      autoApprovalEnabled: !manualReviewRequired,
    },
    update: {
      manualReviewRequired,
      autoApprovalEnabled: !manualReviewRequired,
    },
    select: { id: true },
  });

  revalidatePath("/inbox");
}
