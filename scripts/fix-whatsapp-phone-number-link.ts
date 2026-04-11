import "dotenv/config";
import { db } from "../src/lib/db";

function getArgValue(name: string) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith("--")) return null;
  return v;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Este script não pode rodar em produção.");
  }

  const apply = process.argv.includes("--apply");

  const phoneNumberId = (getArgValue("--phone-number-id") || "1097495053448641").trim();
  if (!phoneNumberId) throw new Error("Missing --phone-number-id");

  const targetOrgSlug = (getArgValue("--target-org-slug") || "dpautomacao").trim();
  const targetOrgName = getArgValue("--target-org-name")?.trim() || null;

  const targetOrg = await db.organization.findFirst({
    where: targetOrgName ? { OR: [{ slug: targetOrgSlug }, { name: targetOrgName }] } : { slug: targetOrgSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!targetOrg) {
    throw new Error(
      targetOrgName
        ? `Organização alvo não encontrada (slug=${targetOrgSlug} ou name=${targetOrgName}).`
        : `Organização alvo não encontrada (slug=${targetOrgSlug}).`
    );
  }

  const current = await db.integrationConnection.findFirst({
    where: { type: "whatsapp", whatsappPhoneNumberId: phoneNumberId },
    select: { id: true, status: true, whatsappPhoneNumberId: true, organization: { select: { id: true, name: true, slug: true } } },
  });

  const targetExisting = await db.integrationConnection.findUnique({
    where: { organizationId_type: { organizationId: targetOrg.id, type: "whatsapp" } },
    select: { id: true, status: true, whatsappPhoneNumberId: true },
  });

  const plan = {
    mode: apply ? "apply" : "preview",
    phoneNumberId,
    targetOrg,
    currentLink: current
      ? {
          connectionId: current.id,
          status: current.status,
          whatsappPhoneNumberId: current.whatsappPhoneNumberId,
          organization: current.organization,
        }
      : null,
    targetExisting: targetExisting
      ? { connectionId: targetExisting.id, status: targetExisting.status, whatsappPhoneNumberId: targetExisting.whatsappPhoneNumberId }
      : null,
    actions: {
      clearWrongOrgLink: Boolean(current && current.organization.id !== targetOrg.id),
      upsertTargetOrgLink: true,
    },
  };

  console.log(JSON.stringify({ ok: true, plan }, null, 2));
  if (!apply) return;

  await db.$transaction(async (tx) => {
    if (current && current.organization.id !== targetOrg.id) {
      await tx.integrationConnection.update({
        where: { id: current.id },
        data: { whatsappPhoneNumberId: null, status: "disabled" },
        select: { id: true },
      });
    }

    await tx.integrationConnection.upsert({
      where: { organizationId_type: { organizationId: targetOrg.id, type: "whatsapp" } },
      create: {
        organizationId: targetOrg.id,
        type: "whatsapp",
        status: "active",
        whatsappPhoneNumberId: phoneNumberId,
      },
      update: {
        status: "active",
        whatsappPhoneNumberId: phoneNumberId,
      },
      select: { id: true },
    });
  });

  const afterCurrent = await db.integrationConnection.findFirst({
    where: { type: "whatsapp", whatsappPhoneNumberId: phoneNumberId },
    select: { id: true, status: true, whatsappPhoneNumberId: true, organization: { select: { id: true, name: true, slug: true } } },
  });

  const targetAfter = await db.integrationConnection.findUnique({
    where: { organizationId_type: { organizationId: targetOrg.id, type: "whatsapp" } },
    select: { id: true, status: true, whatsappPhoneNumberId: true },
  });

  console.log(JSON.stringify({ ok: true, applied: true, afterCurrent, targetAfter }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

