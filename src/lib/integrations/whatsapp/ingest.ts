"use server";

import { db } from "@/lib/db";
import { getOrganizationFeatureConfig } from "@/lib/features";
import { parseTextWithOpenAI } from "@/lib/ai/text-parser";
import { createSmartDraftFromWhatsappMessage, applyTextExtractionToDraft } from "@/lib/smart-inbox/drafts";
import { estimateOpenAiCostCents } from "@/lib/openai-pricing";
import type { WhatsappInboundEvent } from "@/lib/integrations/whatsapp/parse";

function isIntegrationsAllowedByPlan(plan: string) {
  return plan === "pro" || plan === "enterprise";
}

export async function ingestWhatsappInboundEvent(event: WhatsappInboundEvent) {
  const debug = process.env.NODE_ENV !== "production" || process.env.WHATSAPP_DEBUG === "1";
  const phoneNumberId = event.phoneNumberId;
  if (!phoneNumberId) {
    if (debug) console.log("[WEBHOOK] Ingest ignorado: missing_phone_number_id");
    return { ok: true as const, skipped: true as const, reason: "missing_phone_number_id" as const };
  }

  const connection = await db.integrationConnection.findFirst({
    where: { type: "whatsapp", status: "active", whatsappPhoneNumberId: phoneNumberId },
    select: { id: true, organizationId: true, organization: { select: { name: true } } },
  });

  if (debug) {
    console.log("[WEBHOOK] Roteamento Backend:");
    console.log(`  - phone_number_id recebido: ${phoneNumberId}`);
  }
  if (connection) {
    if (debug) {
      console.log(`  - IntegrationConnection encontrada: ${connection.id}`);
      console.log(`  - organizationId resolvido: ${connection.organizationId}`);
      console.log(`  - organization name resolvida: ${connection.organization.name}`);
    }
  } else {
    if (debug) console.log("  - NENHUMA IntegrationConnection encontrada para este phone_number_id.");
    return { ok: true as const, skipped: true as const, reason: "unknown_connection" as const };
  }

  const cfg = await getOrganizationFeatureConfig(connection.organizationId);
  const sub = await db.subscription.findUnique({
    where: { organizationId: connection.organizationId },
    select: { plan: true },
  });
  const plan = sub?.plan ?? "free";
  const integrationsAllowed = isIntegrationsAllowedByPlan(plan);
  const effectiveWhatsappEnabled = integrationsAllowed && cfg.whatsappEnabled;
  const effectiveOpenAiEnabled = integrationsAllowed && cfg.openAiEnabled;

  const msg = await db.whatsappMessage.upsert({
    where: { externalId: event.externalId },
    create: {
      organizationId: connection.organizationId,
      connectionId: connection.id,
      externalId: event.externalId,
      direction: "inbound",
      messageType: event.messageType,
      fromNumber: event.fromNumber,
      toNumber: event.toNumber,
      textBody: event.textBody,
      mediaId: event.mediaId,
      mediaMimeType: event.mediaMimeType,
      raw: event.raw as object,
      receivedAt: new Date(),
    },
    update: {
      raw: event.raw as object,
      textBody: event.textBody,
      mediaId: event.mediaId,
      mediaMimeType: event.mediaMimeType,
    },
    select: { id: true, organizationId: true, messageType: true, textBody: true },
  });

  if (!effectiveWhatsappEnabled) {
    if (debug) console.log(`[WEBHOOK] WhatsApp bloqueado por plano/config (plan=${plan}).`);
    return { ok: true as const, skipped: true as const, reason: "whatsapp_disabled" as const };
  }

  if (msg.messageType === "text") {
    if (!cfg.whatsappReceiveText) return { ok: true as const, skipped: true as const, reason: "text_disabled" as const };
    const draft = await createSmartDraftFromWhatsappMessage({
      organizationId: msg.organizationId,
      whatsappMessageId: msg.id,
      originalText: msg.textBody,
    });

    if (effectiveOpenAiEnabled && cfg.openAiTextParsing && typeof msg.textBody === "string" && msg.textBody.trim().length > 0) {
      try {
        const extraction = await parseTextWithOpenAI(msg.textBody);
        await applyTextExtractionToDraft({ draftId: draft.id, extraction });
        const model = extraction.raw?.model ? String(extraction.raw.model) : null;
        const usage =
          extraction.raw && typeof extraction.raw === "object" && "usage" in extraction.raw && extraction.raw.usage && typeof extraction.raw.usage === "object"
            ? (extraction.raw.usage as Record<string, unknown>)
            : null;
        const inputTokens = typeof usage?.inputTokens === "number" ? usage.inputTokens : 0;
        const outputTokens = typeof usage?.outputTokens === "number" ? usage.outputTokens : 0;
        const cost = model ? estimateOpenAiCostCents({ model, inputTokens, outputTokens }) : { ok: false as const, costCents: 0 };
        await db.aiExtraction.create({
          data: {
            organizationId: msg.organizationId,
            whatsappMessageId: msg.id,
            status: "completed",
            kind: "text_parse",
            model,
            input: { text: msg.textBody },
            output: extraction as unknown as object,
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            costCents: cost.costCents,
          },
          select: { id: true },
        });
      } catch (err) {
        await db.aiExtraction.create({
          data: {
            organizationId: msg.organizationId,
            whatsappMessageId: msg.id,
            status: "failed",
            kind: "text_parse",
            model: process.env.OPENAI_MODEL_TEXT || null,
            input: { text: msg.textBody },
            error: err instanceof Error ? err.message : "Erro ao interpretar texto.",
          },
          select: { id: true },
        });
      }
    } else {
      await db.aiExtraction.create({
        data: {
          organizationId: msg.organizationId,
          whatsappMessageId: msg.id,
          status: "skipped",
          kind: "text_parse",
          model: null,
          input: { text: msg.textBody },
        },
        select: { id: true },
      });
    }

    await db.whatsappMessage.update({
      where: { id: msg.id },
      data: { processedAt: new Date() },
      select: { id: true },
    });

    return { ok: true as const, skipped: false as const };
  }

  if (msg.messageType === "audio") {
    if (!cfg.whatsappReceiveAudio) return { ok: true as const, skipped: true as const, reason: "audio_disabled" as const };
    return { ok: true as const, skipped: true as const, reason: "audio_not_implemented" as const };
  }

  if (msg.messageType === "image") {
    if (!cfg.whatsappReceiveImage) return { ok: true as const, skipped: true as const, reason: "image_disabled" as const };
    return { ok: true as const, skipped: true as const, reason: "image_not_implemented" as const };
  }

  return { ok: true as const, skipped: true as const, reason: "unknown_type" as const };
}
