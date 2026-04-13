"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getOrganizationFeatureConfig } from "@/lib/features";
import { parseTextWithOpenAI } from "@/lib/ai/text-parser";
import { detectTypeByHeuristic } from "@/lib/ai/detect-type";
import { isProbablyMultiTransactionMessage } from "@/lib/ai/detect-multi";
import { resolveSafeTransactionName } from "@/lib/ai/resolve-name";
import { splitBatchMessage } from "@/lib/ai/split-batch";
import { resolveSubcategoryIdByText } from "@/lib/ai/subcategory";
import { createSmartDraftFromWhatsappMessage, applyTextExtractionToDraft } from "@/lib/smart-inbox/drafts";
import { estimateOpenAiCostCents } from "@/lib/openai-pricing";
import { getMonthPeriod } from "@/lib/usage";
import { getWhatsappIdentity, resolveUserForCentralInbound } from "@/lib/integrations/whatsapp/identity";
import type { WhatsappInboundEvent } from "@/lib/integrations/whatsapp/parse";

function isIntegrationsAllowedByPlan(plan: string) {
  return plan !== "free";
}

function isBasicPlan(plan: string) {
  return plan === "basic" || plan === "starter";
}

function normalizePlan(plan: string) {
  return plan === "starter" ? "basic" : plan;
}

function getWhatsappTestBypassEmails() {
  const raw = process.env.WHATSAPP_TEST_BYPASS_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

function isEmailInWhatsappBypass(email: string | null | undefined, bypassEmails: Set<string>) {
  if (!email) return false;
  if (!bypassEmails.size) return false;
  return bypassEmails.has(String(email).trim().toLowerCase());
}

function getCentralCountryByPhoneNumberId(phoneNumberId: string) {
  const map: Array<[string, string | undefined]> = [
    ["BR", process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID_BR],
    ["US", process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID_US],
    ["ES", process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID_ES],
    ["DE", process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID_DE],
  ];

  for (const [country, id] of map) {
    if (id && id === phoneNumberId) return country;
  }
  return null;
}

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function normalizeForMatch(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

type CategoryKey = "SAUDE" | "TRANSPORTE" | "ALIMENTACAO" | "MORADIA" | "CONTAS";

function suggestCategoryKey(text: string) {
  const t = normalizeForMatch(text);
  const rules: Array<{ key: CategoryKey; terms: string[] }> = [
    { key: "SAUDE", terms: ["medico", "médico", "hospital", "consulta", "farmacia", "farmácia", "remedio", "remédio", "exame"] },
    { key: "TRANSPORTE", terms: ["uber", "99", "taxi", "táxi", "combustivel", "combustível", "gasolina", "estacionamento", "onibus", "ônibus", "metro", "metrô"] },
    { key: "ALIMENTACAO", terms: ["mercado", "ifood", "i-food", "restaurante", "padaria", "lanche", "almoço", "almoco", "jantar", "cafe", "café"] },
    { key: "MORADIA", terms: ["aluguel", "condominio", "condomínio", "prestacao", "prestação", "imovel", "imóvel"] },
    { key: "CONTAS", terms: ["internet", "luz", "energia", "agua", "água", "gas", "gás", "telefone", "celular"] },
  ];

  for (const r of rules) {
    for (const term of r.terms) {
      if (t.includes(normalizeForMatch(term))) return r.key;
    }
  }
  return null;
}

function categoryNameCandidates(key: CategoryKey) {
  const map: Record<CategoryKey, string[]> = {
    SAUDE: ["Saúde", "Saude", "Saude e Bem-estar", "Saúde e Bem-estar"],
    TRANSPORTE: ["Transporte", "Mobilidade"],
    ALIMENTACAO: ["Alimentação", "Alimentacao", "Alimentos", "Restaurantes"],
    MORADIA: ["Moradia", "Casa", "Habitação", "Habitacao"],
    CONTAS: ["Contas", "Contas Fixas", "Serviços", "Servicos"],
  };
  return map[key];
}

async function resolveCategoryIdByText({
  organizationId,
  txType,
  text,
  debug,
}: {
  organizationId: string;
  txType: "income" | "expense";
  text: string;
  debug: boolean;
}) {
  const key = suggestCategoryKey(text);
  if (debug && key) console.log(`[IA] Categoria sugerida: ${key}`);

  const categories = await db.category.findMany({
    where: { organizationId, type: txType },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, name: true },
  });

  const normalizedToId = new Map<string, { id: string; name: string }>();
  for (const c of categories) normalizedToId.set(normalizeForMatch(c.name), { id: c.id, name: c.name });

  if (key) {
    for (const candidate of categoryNameCandidates(key)) {
      const found = normalizedToId.get(normalizeForMatch(candidate));
      if (found) {
        if (debug) console.log(`[IA] Categoria encontrada no banco: ${found.id}`);
        return found;
      }
    }
    if (debug) console.log("[IA] Fallback: categoria não encontrada");
  }

  for (const fallback of ["Outros", "Geral", "Sem categoria"]) {
    const found = normalizedToId.get(normalizeForMatch(fallback));
    if (found) {
      if (debug) console.log(`[IA] Categoria fallback usada: ${found.id}`);
      return found;
    }
  }

  return null;
}

async function resolveSingleAccount({
  organizationId,
  debug,
}: {
  organizationId: string;
  debug: boolean;
}) {
  const accounts = await db.account.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    take: 2,
    select: { id: true, type: true, name: true },
  });

  if (accounts.length === 1) {
    if (debug) console.log(`[IA] Conta única detectada: ${accounts[0].id}`);
    return accounts[0];
  }
  if (debug && accounts.length > 1) console.log("[IA] Fallback: múltiplas contas");
  return null;
}

export async function ingestWhatsappInboundEvent(event: WhatsappInboundEvent) {
  const debug = process.env.NODE_ENV !== "production" || process.env.WHATSAPP_DEBUG === "1";
  const tenantDebug = process.env.TENANT_DEBUG === "1";
  const phoneNumberId = event.phoneNumberId;
  if (!phoneNumberId) {
    if (debug) console.log("[WEBHOOK] Ingest ignorado: missing_phone_number_id");
    return { ok: true as const, skipped: true as const, reason: "missing_phone_number_id" as const };
  }

  const centralCountry = getCentralCountryByPhoneNumberId(phoneNumberId);
  if (centralCountry) {
    if (tenantDebug) console.log("[TENANT] whatsapp_webhook", { mode: "central", phoneNumberId, businessAccountId: event.businessAccountId ?? null });
    const enableBsuidFallback = process.env.WHATSAPP_ENABLE_BSUID_FALLBACK === "true";
    const identity = getWhatsappIdentity(event);
    if (!identity.phoneDigits && !identity.whatsappUserId) {
      if (debug) console.log("[WEBHOOK] Central: webhook sem sender (phone/user_id).");
      return { ok: true as const, skipped: true as const, reason: "missing_phone_sender" as const };
    }

    let binding = await db.whatsappCentralBinding.findFirst({
      where: {
        status: "active",
        OR: [
          identity.whatsappUserId ? { whatsappUserId: identity.whatsappUserId } : undefined,
          identity.phoneDigits ? { phoneDigits: identity.phoneDigits } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true, organizationId: true, userId: true, phoneDigits: true, whatsappUserId: true, user: { select: { email: true } } },
    });

    if (!binding) {
      let reason = "unknown";
      if (!identity.phoneDigits) {
        reason = "missing_phone_digits";
      } else {
        const resolvedUser = await resolveUserForCentralInbound({ identity, enableBsuidFallback });
        if (!resolvedUser) {
          reason = "user_not_unique_or_not_found";
        } else {
          const memberships = await db.membership.findMany({
            where: {
              userId: resolvedUser.id,
              organization: { subscription: { plan: { in: ["basic", "starter"] }, status: { in: ["active", "trialing"] } } },
            },
            select: { organizationId: true },
            take: 2,
            orderBy: { createdAt: "asc" },
          });
          if (memberships.length !== 1) {
            reason = "org_not_unique_or_not_found";
          } else {
            const orgId = memberships[0]?.organizationId ?? null;
            if (!orgId) {
              reason = "org_not_unique_or_not_found";
            } else {
              try {
                binding = await db.whatsappCentralBinding.create({
                  data: {
                    organizationId: orgId,
                    userId: resolvedUser.id,
                    phoneDigits: identity.phoneDigits,
                    whatsappUserId: identity.whatsappUserId ?? null,
                    status: "active",
                    lastSeenAt: new Date(),
                  },
                  select: {
                    id: true,
                    organizationId: true,
                    userId: true,
                    phoneDigits: true,
                    whatsappUserId: true,
                    user: { select: { email: true } },
                  },
                });
                reason = "created";
              } catch {
                reason = "binding_conflict";
              }
            }
          }
        }
      }

      if (debug) {
        console.log("[WHATSAPP_BINDING_AUTO]", {
          phone: identity.phoneDigits ?? null,
          userId: binding?.userId ?? null,
          organizationId: binding?.organizationId ?? null,
          criado: Boolean(binding),
          motivo: reason,
        });
      }

      if (!binding) {
        if (debug) console.log("[WEBHOOK] Central: sender sem vínculo (binding) para tenant.");
        if (tenantDebug) console.log("[TENANT] whatsapp_central_binding", { resolved: false, phoneDigits: identity.phoneDigits ?? null, whatsappUserId: identity.whatsappUserId ?? null });
        return { ok: true as const, skipped: true as const, reason: "binding_required" as const };
      }
    }

    if (tenantDebug) {
      console.log("[TENANT] whatsapp_central_binding", {
        resolved: true,
        bindingId: binding.id,
        organizationId: binding.organizationId,
        userId: binding.userId,
      });
    }

    const membership = await db.membership.findFirst({
      where: {
        userId: binding.userId,
        organizationId: binding.organizationId,
        organization: { subscription: { plan: { in: ["basic", "starter"] }, status: { in: ["active", "trialing"] } } },
      },
      select: { id: true },
    });
    if (!membership) {
      if (debug) console.log("[WEBHOOK] Central: vínculo inválido (sem membership/plano).");
      return { ok: true as const, skipped: true as const, reason: "not_eligible" as const };
    }

    const organizationId = binding.organizationId;
    const limit = Number.parseInt(process.env.WHATSAPP_BASIC_MONTHLY_LIMIT || "20", 10);
    const now = new Date();
    const period = getMonthPeriod(now);
    const metricKey = `whatsapp_basic_units_org_${organizationId}`;

    const [conn, cfg, sub] = await Promise.all([
      db.integrationConnection.upsert({
        where: { organizationId_type: { organizationId, type: "whatsapp" } },
        create: { organizationId, type: "whatsapp", status: "active" },
        update: { status: "active" },
        select: { id: true },
      }),
      getOrganizationFeatureConfig(organizationId),
      db.subscription.findUnique({ where: { organizationId }, select: { plan: true } }),
    ]);
    if (tenantDebug) console.log("[TENANT] whatsapp_connection", { integrationConnectionId: conn.id, organizationId });

    const plan = sub?.plan ?? "free";
    if (!isBasicPlan(plan)) {
      if (debug) console.log(`[WEBHOOK] Central: org não é BASIC (plan=${plan}).`);
      return { ok: true as const, skipped: true as const, reason: "not_eligible" as const };
    }
    if (debug) console.log(`[WEBHOOK] Central: plano aceito (plan=${plan}).`);

    const msg = await db.whatsappMessage.upsert({
      where: { externalId: event.externalId },
      create: {
        organizationId,
        connectionId: conn.id,
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

    const existingMetric = await db.usageMetric.findUnique({
      where: {
        organizationId_metricKey_periodStart_periodEnd: {
          organizationId,
          metricKey,
          periodStart: period.start,
          periodEnd: period.end,
        },
      },
      select: { metricValue: true },
    });
    const used = existingMetric?.metricValue ?? 0;

    const bypassEmails = getWhatsappTestBypassEmails();
    const bypass = used >= limit && isEmailInWhatsappBypass(binding.user?.email ?? null, bypassEmails);
    if (bypass && debug) console.log("[WEBHOOK] Bypass de limite aplicado para usuário de homologação");

    if (used >= limit && !bypass) {
      if (debug) console.log(`[WEBHOOK] Central: limite BASIC atingido (used=${used}, limit=${limit}).`);
      await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId }, data: { processedAt: new Date() } });
      return { ok: true as const, skipped: true as const, reason: "basic_limit_reached" as const };
    }

    await db.usageMetric.upsert({
      where: {
        organizationId_metricKey_periodStart_periodEnd: {
          organizationId,
          metricKey,
          periodStart: period.start,
          periodEnd: period.end,
        },
      },
      create: {
        organizationId,
        metricKey,
        metricValue: 1,
        periodStart: period.start,
        periodEnd: period.end,
        userId: binding.userId,
      },
      update: { metricValue: { increment: 1 } },
      select: { id: true },
    });

    await db.whatsappCentralBinding.updateMany({
      where: { id: binding.id, status: "active" },
      data: {
        lastSeenAt: new Date(),
        phoneDigits: binding.phoneDigits ?? identity.phoneDigits ?? null,
        whatsappUserId: binding.whatsappUserId ?? identity.whatsappUserId ?? null,
      },
    });

    if (msg.messageType !== "text") {
      await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId }, data: { processedAt: new Date() } });
      return { ok: true as const, skipped: true as const, reason: "message_type_not_supported" as const };
    }

    if (!cfg.whatsappReceiveText) {
      await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId }, data: { processedAt: new Date() } });
      return { ok: true as const, skipped: true as const, reason: "text_disabled" as const };
    }

    const manualReviewRequired = cfg.manualReviewRequired;
    if (debug) console.log(`[WEBHOOK] Aprovação resolvida: ${manualReviewRequired ? "manual" : "automatica"}`);

    const isMulti = typeof msg.textBody === "string" && isProbablyMultiTransactionMessage(msg.textBody);
    if (isMulti && debug) {
      console.log("[IA] Mensagem em lote detectada");
      const items = splitBatchMessage(msg.textBody ?? "");
      console.log("[IA] Itens extraídos do lote:", items.length);
    }

    if (isMulti && typeof msg.textBody === "string") {
      const items = splitBatchMessage(msg.textBody ?? "");
      for (let i = 0; i < items.length; i++) {
        const itemText = items[i] ?? "";
        if (debug) console.log("[IA] Processando item do lote:", itemText.slice(0, 140));

        const draft = await createSmartDraftFromWhatsappMessage({
          organizationId,
          whatsappMessageId: msg.id,
          originalText: itemText,
          batchItemIndex: i,
        });
        if (draft.status !== "pending_review") continue;

        if (!manualReviewRequired && cfg.openAiEnabled && cfg.openAiTextParsing && itemText.trim().length > 0) {
          try {
            const extraction = await parseTextWithOpenAI(itemText);
            const heuristic = detectTypeByHeuristic(itemText);
            const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
            const resolvedType =
              extraction.type === "income" || extraction.type === "expense"
                ? extraction.type
                : heuristicType && heuristic.kind !== "ambiguous"
                  ? heuristicType
                  : null;

            const resolvedName = resolveSafeTransactionName(itemText, extraction.name);
            const hasMinimum =
              (extraction.confidence === "high" || extraction.confidence === "medium") &&
              (resolvedType === "income" || resolvedType === "expense") &&
              typeof extraction.amount === "number" &&
              Number.isFinite(extraction.amount) &&
              extraction.amount > 0 &&
              typeof resolvedName.name === "string" &&
              resolvedName.name.trim().length > 0;

            if (hasMinimum) {
              const txType = resolvedType as "income" | "expense";
              const [account, category] = await Promise.all([
                resolveSingleAccount({ organizationId, debug }),
                resolveCategoryIdByText({ organizationId, txType, text: itemText, debug }),
              ]);

              if (account && category) {
                const subcategory = await resolveSubcategoryIdByText({
                  organizationId,
                  categoryId: category.id,
                  categoryName: category.name,
                  text: itemText,
                  debug,
                });
                if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
                await db.transaction.create({
                  data: {
                    organizationId,
                    name: resolvedName.name.trim().slice(0, 120),
                    amount: new Prisma.Decimal((extraction.amount as number).toFixed(2)),
                    type: txType,
                    date: toDateOnly(new Date()),
                    isFixed: false,
                    isVariable: true,
                    entityType: account.type,
                    source: "whatsapp",
                    categoryId: category.id,
                    subcategoryId: subcategory?.id ?? null,
                    accountId: account.id,
                    notes: typeof extraction.notes === "string" && extraction.notes.trim().length > 0 ? extraction.notes : null,
                    costCenterId: null,
                  },
                  select: { id: true },
                });
                if (debug) console.log("[IA] Item do lote inserido automaticamente");
                await db.smartDraft.updateMany({
                  where: { id: draft.id, organizationId, status: "pending_review" },
                  data: { status: "applied" },
                });
                continue;
              }
            }

            const nameResolved = resolveSafeTransactionName(itemText, extraction.name);
            const txTypeForDraft = resolvedType === "income" || resolvedType === "expense" ? resolvedType : null;
            if (txTypeForDraft) {
              const [account, category] = await Promise.all([
                resolveSingleAccount({ organizationId, debug }),
                resolveCategoryIdByText({ organizationId, txType: txTypeForDraft, text: itemText, debug }),
              ]);
              const subcategory = category
                ? await resolveSubcategoryIdByText({
                    organizationId,
                    categoryId: category.id,
                    categoryName: category.name,
                    text: itemText,
                    debug,
                  })
                : null;
              if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
              const enriched = {
                ...extraction,
                name: nameResolved.name ?? extraction.name,
                category: category?.name ?? null,
                categoryId: category?.id ?? null,
                subcategory: subcategory?.name ?? null,
                subcategoryId: subcategory?.id ?? null,
                account: account?.name ?? null,
              };
              await applyTextExtractionToDraft({
                organizationId,
                draftId: draft.id,
                extraction: enriched,
              });
            } else {
              await applyTextExtractionToDraft({ organizationId, draftId: draft.id, extraction });
            }

            if (debug) console.log("[IA] Item do lote enviado para revisão");
          } catch {
            if (debug) console.log("[IA] Item do lote enviado para revisão");
          }
        } else if (cfg.openAiTextParsing && itemText.trim().length > 0) {
          try {
            const extraction = await parseTextWithOpenAI(itemText);
            const heuristic = detectTypeByHeuristic(itemText);
            const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
            const txType =
              extraction.type === "income" || extraction.type === "expense"
                ? (extraction.type as "income" | "expense")
                : heuristicType && heuristic.kind !== "ambiguous"
                  ? (heuristicType as "income" | "expense")
                  : null;
            if (txType) {
              const nameResolved = resolveSafeTransactionName(itemText, extraction.name);
              const [account, category] = await Promise.all([
                resolveSingleAccount({ organizationId, debug }),
                resolveCategoryIdByText({ organizationId, txType, text: itemText, debug }),
              ]);
              const subcategory = category
                ? await resolveSubcategoryIdByText({
                    organizationId,
                    categoryId: category.id,
                    categoryName: category.name,
                    text: itemText,
                    debug,
                  })
                : null;
              if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
              const enriched = {
                ...extraction,
                name: nameResolved.name ?? extraction.name,
                category: category?.name ?? null,
                categoryId: category?.id ?? null,
                subcategory: subcategory?.name ?? null,
                subcategoryId: subcategory?.id ?? null,
                account: account?.name ?? null,
              };
              await applyTextExtractionToDraft({ organizationId, draftId: draft.id, extraction: enriched });
            } else {
              await applyTextExtractionToDraft({ organizationId, draftId: draft.id, extraction });
            }
          } catch {}
          if (debug) console.log("[IA] Item do lote enviado para revisão");
        } else {
          if (debug) console.log("[IA] Item do lote enviado para revisão");
        }
      }

      await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId }, data: { processedAt: new Date() } });
      return { ok: true as const, processed: true as const, mode: "batch" as const };
    }

    const canAttemptAuto =
      !isMulti &&
      !manualReviewRequired &&
      cfg.openAiEnabled &&
      cfg.openAiTextParsing &&
      typeof msg.textBody === "string" &&
      msg.textBody.trim().length > 0;

    if (canAttemptAuto) {
      try {
        const extraction = await parseTextWithOpenAI(msg.textBody as string);
        const heuristic = detectTypeByHeuristic(msg.textBody as string);
        const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
        const resolvedType =
          extraction.type === "income" || extraction.type === "expense"
            ? extraction.type
            : heuristicType && heuristic.kind !== "ambiguous"
              ? heuristicType
              : null;
        if (debug) console.log("[IA] Type final resolvido:", resolvedType ?? "null");

        const resolvedName = resolveSafeTransactionName(msg.textBody as string, extraction.name);
        if (debug) console.log("[IA] Nome vindo do parser:", typeof extraction.name === "string" ? extraction.name : "null");
        if (debug && resolvedName.source === "heuristic") console.log("[IA] Nome fallback por heurística:", resolvedName.name);

        const hasMinimum =
          (extraction.confidence === "high" || extraction.confidence === "medium") &&
          (resolvedType === "income" || resolvedType === "expense") &&
          typeof extraction.amount === "number" &&
          Number.isFinite(extraction.amount) &&
          extraction.amount > 0 &&
          typeof resolvedName.name === "string" &&
          resolvedName.name.trim().length > 0;

        if (hasMinimum) {
          const txType = resolvedType as "income" | "expense";
          const [account, category] = await Promise.all([
            resolveSingleAccount({ organizationId, debug }),
            resolveCategoryIdByText({ organizationId, txType, text: msg.textBody ?? "", debug }),
          ]);

          if (account && category) {
            const subcategory = await resolveSubcategoryIdByText({
              organizationId,
              categoryId: category.id,
              categoryName: category.name,
              text: msg.textBody ?? "",
              debug,
            });
            if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
            if (debug && txType === "income" && resolvedName.source === "heuristic") {
              console.log("[IA] Receita explícita liberada para inserção automática");
            }
            const txName = resolvedName.name.trim().slice(0, 120);
            const txAmount = extraction.amount as number;
            await db.transaction.create({
              data: {
                organizationId,
                name: txName,
                amount: new Prisma.Decimal(txAmount.toFixed(2)),
                type: txType,
                date: toDateOnly(new Date()),
                isFixed: false,
                isVariable: true,
                entityType: account.type,
                source: "whatsapp",
                categoryId: category.id,
                subcategoryId: subcategory?.id ?? null,
                accountId: account.id,
                notes: typeof extraction.notes === "string" && extraction.notes.trim().length > 0 ? extraction.notes : null,
              },
              select: { id: true },
            });
            if (debug) console.log("[WEBHOOK] Transação criada diretamente");

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
                organizationId,
                userId: binding.userId,
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

            await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId }, data: { processedAt: new Date() } });
            return { ok: true as const, processed: true as const, mode: "auto_transaction" as const };
          }

          if (debug) console.log("[WEBHOOK] Fallback: conta/categoria insuficiente para inserir automaticamente");
        } else {
          if (debug && resolvedType === "income" && extraction.amount && !resolvedName.name) {
            console.log("[IA] Fallback para draft por nome insuficiente");
          }
          if (debug) console.log("[WEBHOOK] Fallback: parse insuficiente para inserir automaticamente");
        }
      } catch {
        if (debug) console.log("[WEBHOOK] Fallback: erro ao interpretar texto");
      }
    }

    const draft = await createSmartDraftFromWhatsappMessage({
      organizationId,
      whatsappMessageId: msg.id,
      originalText: msg.textBody,
    });

    if (debug) console.log("[WEBHOOK] Draft: iniciando");

    if (isMulti && cfg.openAiTextParsing && typeof msg.textBody === "string" && msg.textBody.trim().length > 0) {
      try {
        const extraction = await parseTextWithOpenAI(msg.textBody);
        await applyTextExtractionToDraft({ organizationId, draftId: draft.id, extraction });
        if (debug) console.log("[WEBHOOK] Draft: multi_detectado");
      } catch {
        if (debug) console.log("[WEBHOOK] Draft: erro ao marcar multi");
      }
    }

    if (!isMulti && cfg.openAiTextParsing && typeof msg.textBody === "string" && msg.textBody.trim().length > 0) {
      try {
        const extraction = await parseTextWithOpenAI(msg.textBody);
        const heuristic = detectTypeByHeuristic(msg.textBody);
        const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
        const txType =
          extraction.type === "income" || extraction.type === "expense"
            ? (extraction.type as "income" | "expense")
            : heuristicType && heuristic.kind !== "ambiguous"
              ? (heuristicType as "income" | "expense")
              : null;
        if (txType) {
          const nameResolved = resolveSafeTransactionName(msg.textBody, extraction.name);
          const [account, category] = await Promise.all([
            resolveSingleAccount({ organizationId, debug }),
            resolveCategoryIdByText({ organizationId, txType, text: msg.textBody, debug }),
          ]);
          const subcategory = category
            ? await resolveSubcategoryIdByText({
                organizationId,
                categoryId: category.id,
                categoryName: category.name,
                text: msg.textBody,
                debug,
              })
            : null;
          if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
          const enriched = {
            ...extraction,
            name: nameResolved.name ?? extraction.name,
            category: category?.name ?? null,
            categoryId: category?.id ?? null,
            subcategory: subcategory?.name ?? null,
            subcategoryId: subcategory?.id ?? null,
            account: account?.name ?? null,
          };
          await applyTextExtractionToDraft({ organizationId, draftId: draft.id, extraction: enriched });
        } else {
          await applyTextExtractionToDraft({ organizationId, draftId: draft.id, extraction });
        }
        if (debug) console.log("[WEBHOOK] Draft: concluido");
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
            organizationId,
            userId: binding.userId,
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
        if (debug) console.log("[WEBHOOK] Draft: erro ao interpretar");
        await db.aiExtraction.create({
          data: {
            organizationId,
            userId: binding.userId,
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
          organizationId,
          userId: binding.userId,
          whatsappMessageId: msg.id,
          status: "skipped",
          kind: "text_parse",
          model: null,
          input: { text: msg.textBody },
        },
        select: { id: true },
      });
    }

    await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId }, data: { processedAt: new Date() } });
    return { ok: true as const, processed: true as const, mode: "basic_central" as const };
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
    if (tenantDebug) console.log("[TENANT] whatsapp_webhook", { mode: "direct", phoneNumberId, integrationConnectionId: connection.id, organizationId: connection.organizationId });
  } else {
    if (debug) console.log("  - NENHUMA IntegrationConnection encontrada para este phone_number_id.");
    return { ok: true as const, skipped: true as const, reason: "unknown_connection" as const };
  }

  const cfg = await getOrganizationFeatureConfig(connection.organizationId);
  const sub = await db.subscription.findUnique({
    where: { organizationId: connection.organizationId },
    select: { plan: true },
  });
  const planRaw = sub?.plan ?? "free";
  const plan = normalizePlan(planRaw);
  const integrationsAllowed = isIntegrationsAllowedByPlan(plan);
  const effectiveWhatsappEnabled = integrationsAllowed && cfg.whatsappEnabled;
  const effectiveOpenAiEnabled = integrationsAllowed && cfg.openAiEnabled;

  if (debug) console.log(`[WEBHOOK] Plano resolvido: ${planRaw} (effective=${plan}).`);

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
  if (debug && (plan === "basic" || plan === "pro" || plan === "enterprise")) {
    console.log(`[WEBHOOK] WhatsApp permitido (plan=${plan}).`);
  }

  if (msg.messageType === "text") {
    if (!cfg.whatsappReceiveText) return { ok: true as const, skipped: true as const, reason: "text_disabled" as const };

    if (plan === "basic") {
      const limit = Number.parseInt(process.env.WHATSAPP_BASIC_MONTHLY_LIMIT || "20", 10);
      const period = getMonthPeriod(new Date());
      const metricKey = `whatsapp_basic_units_org_${msg.organizationId}`;
      const existing = await db.usageMetric.findUnique({
        where: {
          organizationId_metricKey_periodStart_periodEnd: {
            organizationId: msg.organizationId,
            metricKey,
            periodStart: period.start,
            periodEnd: period.end,
          },
        },
        select: { metricValue: true },
      });
      const used = existing?.metricValue ?? 0;

      let bypass = false;
      if (used >= limit) {
        const bypassEmails = getWhatsappTestBypassEmails();
        const list = Array.from(bypassEmails);
        if (list.length) {
          const whereOr = list.map((email) => ({ user: { email: { equals: email, mode: "insensitive" as const } } }));
          const found = await db.membership.findFirst({
            where: { organizationId: msg.organizationId, OR: whereOr },
            select: { id: true },
          });
          bypass = Boolean(found);
          if (bypass && debug) console.log("[WEBHOOK] Bypass de limite aplicado para usuário de homologação");
        }
      }

      if (used >= limit && !bypass) {
        if (debug) console.log(`[WEBHOOK] Limite BASIC atingido (used=${used}, limit=${limit}).`);
        await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId: msg.organizationId }, data: { processedAt: new Date() } });
        return { ok: true as const, skipped: true as const, reason: "basic_limit_reached" as const };
      }
      await db.usageMetric.upsert({
        where: {
          organizationId_metricKey_periodStart_periodEnd: {
            organizationId: msg.organizationId,
            metricKey,
            periodStart: period.start,
            periodEnd: period.end,
          },
        },
        create: {
          organizationId: msg.organizationId,
          metricKey,
          metricValue: 1,
          periodStart: period.start,
          periodEnd: period.end,
        },
        update: { metricValue: { increment: 1 } },
        select: { id: true },
      });
      if (debug) console.log(`[WEBHOOK] Limite BASIC consumido (used=${used + 1}/${limit}).`);
    }

    const manualReviewRequired = cfg.manualReviewRequired;
    if (debug) console.log(`[WEBHOOK] Aprovação resolvida: ${manualReviewRequired ? "manual" : "automatica"}`);

    const isMulti = typeof msg.textBody === "string" && isProbablyMultiTransactionMessage(msg.textBody);
    if (isMulti && debug) {
      console.log("[IA] Mensagem em lote detectada");
      const items = splitBatchMessage(msg.textBody ?? "");
      console.log("[IA] Itens extraídos do lote:", items.length);
    }

    if (isMulti && typeof msg.textBody === "string") {
      const items = splitBatchMessage(msg.textBody ?? "");
      for (let i = 0; i < items.length; i++) {
        const itemText = items[i] ?? "";
        if (debug) console.log("[IA] Processando item do lote:", itemText.slice(0, 140));

        const draft = await createSmartDraftFromWhatsappMessage({
          organizationId: msg.organizationId,
          whatsappMessageId: msg.id,
          originalText: itemText,
          batchItemIndex: i,
        });
        if (draft.status !== "pending_review") continue;

        if (!manualReviewRequired && effectiveOpenAiEnabled && cfg.openAiTextParsing && itemText.trim().length > 0) {
          try {
            const extraction = await parseTextWithOpenAI(itemText);
            const heuristic = detectTypeByHeuristic(itemText);
            const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
            const resolvedType =
              extraction.type === "income" || extraction.type === "expense"
                ? extraction.type
                : heuristicType && heuristic.kind !== "ambiguous"
                  ? heuristicType
                  : null;

            const resolvedName = resolveSafeTransactionName(itemText, extraction.name);
            const hasMinimum =
              (extraction.confidence === "high" || extraction.confidence === "medium") &&
              (resolvedType === "income" || resolvedType === "expense") &&
              typeof extraction.amount === "number" &&
              Number.isFinite(extraction.amount) &&
              extraction.amount > 0 &&
              typeof resolvedName.name === "string" &&
              resolvedName.name.trim().length > 0;

            if (hasMinimum) {
              const txType = resolvedType as "income" | "expense";
              const [account, category] = await Promise.all([
                resolveSingleAccount({ organizationId: msg.organizationId, debug }),
                resolveCategoryIdByText({ organizationId: msg.organizationId, txType, text: itemText, debug }),
              ]);
              if (account && category) {
                const subcategory = await resolveSubcategoryIdByText({
                  organizationId: msg.organizationId,
                  categoryId: category.id,
                  categoryName: category.name,
                  text: itemText,
                  debug,
                });
                if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
                await db.transaction.create({
                  data: {
                    organizationId: msg.organizationId,
                    name: resolvedName.name.trim().slice(0, 120),
                    amount: new Prisma.Decimal((extraction.amount as number).toFixed(2)),
                    type: txType,
                    date: toDateOnly(new Date()),
                    isFixed: false,
                    isVariable: true,
                    entityType: account.type,
                    source: "whatsapp",
                    categoryId: category.id,
                    subcategoryId: subcategory?.id ?? null,
                    accountId: account.id,
                    notes: typeof extraction.notes === "string" && extraction.notes.trim().length > 0 ? extraction.notes : null,
                    costCenterId: null,
                  },
                  select: { id: true },
                });
                if (debug) console.log("[IA] Item do lote inserido automaticamente");
                await db.smartDraft.updateMany({
                  where: { id: draft.id, organizationId: msg.organizationId, status: "pending_review" },
                  data: { status: "applied" },
                });
                continue;
              }
            }

            const txTypeForDraft = resolvedType === "income" || resolvedType === "expense" ? resolvedType : null;
            if (txTypeForDraft) {
              const nameResolved = resolveSafeTransactionName(itemText, extraction.name);
              const [account, category] = await Promise.all([
                resolveSingleAccount({ organizationId: msg.organizationId, debug }),
                resolveCategoryIdByText({ organizationId: msg.organizationId, txType: txTypeForDraft, text: itemText, debug }),
              ]);
              const subcategory = category
                ? await resolveSubcategoryIdByText({
                    organizationId: msg.organizationId,
                    categoryId: category.id,
                    categoryName: category.name,
                    text: itemText,
                    debug,
                  })
                : null;
              if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
              const enriched = {
                ...extraction,
                name: nameResolved.name ?? extraction.name,
                category: category?.name ?? null,
                categoryId: category?.id ?? null,
                subcategory: subcategory?.name ?? null,
                subcategoryId: subcategory?.id ?? null,
                account: account?.name ?? null,
              };
              await applyTextExtractionToDraft({ organizationId: msg.organizationId, draftId: draft.id, extraction: enriched });
            } else {
              await applyTextExtractionToDraft({ organizationId: msg.organizationId, draftId: draft.id, extraction });
            }
            if (debug) console.log("[IA] Item do lote enviado para revisão");
          } catch {
            if (debug) console.log("[IA] Item do lote enviado para revisão");
          }
        } else if (effectiveOpenAiEnabled && cfg.openAiTextParsing && itemText.trim().length > 0) {
          try {
            const extraction = await parseTextWithOpenAI(itemText);
            const heuristic = detectTypeByHeuristic(itemText);
            const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
            const txType =
              extraction.type === "income" || extraction.type === "expense"
                ? (extraction.type as "income" | "expense")
                : heuristicType && heuristic.kind !== "ambiguous"
                  ? (heuristicType as "income" | "expense")
                  : null;
            if (txType) {
              const nameResolved = resolveSafeTransactionName(itemText, extraction.name);
              const [account, category] = await Promise.all([
                resolveSingleAccount({ organizationId: msg.organizationId, debug }),
                resolveCategoryIdByText({ organizationId: msg.organizationId, txType, text: itemText, debug }),
              ]);
              const subcategory = category
                ? await resolveSubcategoryIdByText({
                    organizationId: msg.organizationId,
                    categoryId: category.id,
                    categoryName: category.name,
                    text: itemText,
                    debug,
                  })
                : null;
              if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
              const enriched = {
                ...extraction,
                name: nameResolved.name ?? extraction.name,
                category: category?.name ?? null,
                categoryId: category?.id ?? null,
                subcategory: subcategory?.name ?? null,
                subcategoryId: subcategory?.id ?? null,
                account: account?.name ?? null,
              };
              await applyTextExtractionToDraft({ organizationId: msg.organizationId, draftId: draft.id, extraction: enriched });
            } else {
              await applyTextExtractionToDraft({ organizationId: msg.organizationId, draftId: draft.id, extraction });
            }
          } catch {}
          if (debug) console.log("[IA] Item do lote enviado para revisão");
        } else {
          if (debug) console.log("[IA] Item do lote enviado para revisão");
        }
      }

      await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId: msg.organizationId }, data: { processedAt: new Date() } });
      return { ok: true as const, skipped: false as const, mode: "batch" as const };
    }

    const canAttemptAuto =
      !isMulti &&
      !manualReviewRequired &&
      effectiveOpenAiEnabled &&
      cfg.openAiTextParsing &&
      typeof msg.textBody === "string" &&
      msg.textBody.trim().length > 0;

    if (canAttemptAuto) {
      try {
        const extraction = await parseTextWithOpenAI(msg.textBody as string);
        const heuristic = detectTypeByHeuristic(msg.textBody as string);
        const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
        const resolvedType =
          extraction.type === "income" || extraction.type === "expense"
            ? extraction.type
            : heuristicType && heuristic.kind !== "ambiguous"
              ? heuristicType
              : null;
        if (debug) console.log("[IA] Type final resolvido:", resolvedType ?? "null");

        const resolvedName = resolveSafeTransactionName(msg.textBody as string, extraction.name);
        if (debug) console.log("[IA] Nome vindo do parser:", typeof extraction.name === "string" ? extraction.name : "null");
        if (debug && resolvedName.source === "heuristic") console.log("[IA] Nome fallback por heurística:", resolvedName.name);
        const hasMinimum =
          (extraction.confidence === "high" || extraction.confidence === "medium") &&
          (resolvedType === "income" || resolvedType === "expense") &&
          typeof extraction.amount === "number" &&
          Number.isFinite(extraction.amount) &&
          extraction.amount > 0 &&
          typeof resolvedName.name === "string" &&
          resolvedName.name.trim().length > 0;

        if (hasMinimum) {
          const txType = resolvedType as "income" | "expense";
          const [account, category] = await Promise.all([
            resolveSingleAccount({ organizationId: msg.organizationId, debug }),
            resolveCategoryIdByText({ organizationId: msg.organizationId, txType, text: msg.textBody ?? "", debug }),
          ]);

          if (account && category) {
            const subcategory = await resolveSubcategoryIdByText({
              organizationId: msg.organizationId,
              categoryId: category.id,
              categoryName: category.name,
              text: msg.textBody ?? "",
              debug,
            });
            if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
            if (debug && txType === "income" && resolvedName.source === "heuristic") {
              console.log("[IA] Receita explícita liberada para inserção automática");
            }
            const txName = resolvedName.name.trim().slice(0, 120);
            const txAmount = extraction.amount as number;
            await db.transaction.create({
              data: {
                organizationId: msg.organizationId,
                name: txName,
                amount: new Prisma.Decimal(txAmount.toFixed(2)),
                type: txType,
                date: toDateOnly(new Date()),
                isFixed: false,
                isVariable: true,
                entityType: account.type,
                source: "whatsapp",
                categoryId: category.id,
                subcategoryId: subcategory?.id ?? null,
                accountId: account.id,
                notes: typeof extraction.notes === "string" && extraction.notes.trim().length > 0 ? extraction.notes : null,
              },
              select: { id: true },
            });
            if (debug) console.log("[WEBHOOK] Transação criada diretamente");

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

            await db.whatsappMessage.updateMany({ where: { id: msg.id, organizationId: msg.organizationId }, data: { processedAt: new Date() } });
            return { ok: true as const, skipped: false as const, mode: "auto_transaction" as const };
          }

          if (debug) console.log("[WEBHOOK] Fallback: conta/categoria insuficiente para inserir automaticamente");
        } else {
          if (debug && resolvedType === "income" && extraction.amount && !resolvedName.name) {
            console.log("[IA] Fallback para draft por nome insuficiente");
          }
          if (debug) console.log("[WEBHOOK] Fallback: parse insuficiente para inserir automaticamente");
        }
      } catch {
        if (debug) console.log("[WEBHOOK] Fallback: erro ao interpretar texto");
      }
    }

    if (debug) console.log("[WEBHOOK] Draft: iniciando criação");
    const draft = await createSmartDraftFromWhatsappMessage({
      organizationId: msg.organizationId,
      whatsappMessageId: msg.id,
      originalText: msg.textBody,
    });
    if (debug) console.log("[WEBHOOK] Draft: criado");

    if (isMulti && effectiveOpenAiEnabled && cfg.openAiTextParsing && typeof msg.textBody === "string" && msg.textBody.trim().length > 0) {
      try {
        const extraction = await parseTextWithOpenAI(msg.textBody);
        await applyTextExtractionToDraft({ organizationId: msg.organizationId, draftId: draft.id, extraction });
        if (debug) console.log("[WEBHOOK] Draft: multi_detectado");
      } catch {
        if (debug) console.log("[WEBHOOK] Draft: erro ao marcar multi");
      }
    }

    if (!isMulti && effectiveOpenAiEnabled && cfg.openAiTextParsing && typeof msg.textBody === "string" && msg.textBody.trim().length > 0) {
      try {
        const extraction = await parseTextWithOpenAI(msg.textBody);
        const heuristic = detectTypeByHeuristic(msg.textBody);
        const heuristicType = heuristic.kind === "income" ? "income" : heuristic.kind === "expense" ? "expense" : null;
        const txType =
          extraction.type === "income" || extraction.type === "expense"
            ? (extraction.type as "income" | "expense")
            : heuristicType && heuristic.kind !== "ambiguous"
              ? (heuristicType as "income" | "expense")
              : null;
        if (txType) {
          const nameResolved = resolveSafeTransactionName(msg.textBody, extraction.name);
          const [account, category] = await Promise.all([
            resolveSingleAccount({ organizationId: msg.organizationId, debug }),
            resolveCategoryIdByText({ organizationId: msg.organizationId, txType, text: msg.textBody, debug }),
          ]);
          const subcategory = category
            ? await resolveSubcategoryIdByText({
                organizationId: msg.organizationId,
                categoryId: category.id,
                categoryName: category.name,
                text: msg.textBody,
                debug,
              })
            : null;
          if (debug) console.log("[IA] Subcategoria final resolvida:", subcategory?.id ?? "null");
          const enriched = {
            ...extraction,
            name: nameResolved.name ?? extraction.name,
            category: category?.name ?? null,
            categoryId: category?.id ?? null,
            subcategory: subcategory?.name ?? null,
            subcategoryId: subcategory?.id ?? null,
            account: account?.name ?? null,
          };
          await applyTextExtractionToDraft({ organizationId: msg.organizationId, draftId: draft.id, extraction: enriched });
        } else {
          await applyTextExtractionToDraft({ organizationId: msg.organizationId, draftId: draft.id, extraction });
        }
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

    await db.whatsappMessage.updateMany({
      where: { id: msg.id, organizationId: msg.organizationId },
      data: { processedAt: new Date() },
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
