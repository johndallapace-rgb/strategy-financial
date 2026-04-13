"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { clearSessionCookie, createSessionCookie, newPasswordHash, requireAuthContext, verifyPassword } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { seedDefaultFinanceForOrganization } from "@/lib/default-finance";

function slugFromRandom() {
  return `ws_${crypto.randomBytes(8).toString("hex")}`;
}

function normalizePhoneToE164(input: string) {
  const raw = input.trim();
  if (raw.startsWith("+")) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = raw.replace(/\D/g, "");
  let local = digits;
  if ((local.length === 12 || local.length === 13) && local.startsWith("55")) local = local.slice(2);
  if (local.length !== 10 && local.length !== 11) return null;
  if (local.startsWith("0")) return null;
  return `+55${local}`;
}

const phoneSchema = z
  .string()
  .trim()
  .min(1)
  .transform((raw, ctx) => {
    const phone = normalizePhoneToE164(raw);
    if (phone) return phone;
    ctx.addIssue({ code: "custom", message: "Informe um celular/WhatsApp válido." });
    return z.NEVER;
  });

const emailSchema = z.string().trim().toLowerCase().email();
const nameSchema = z.string().trim().min(2).max(80);

const identifierSchema = z.string().trim().min(1).transform((raw, ctx) => {
  let input = raw.trim();
  if (/^mailto:/i.test(input)) input = input.slice(7).trim();

  if (input.includes("@")) {
    const asEmail = z.string().trim().toLowerCase().email().safeParse(input);
    if (asEmail.success) return { kind: "email" as const, value: asEmail.data };
    ctx.addIssue({ code: "custom", message: "Informe um e-mail ou celular válido." });
    return z.NEVER;
  }

  const phone = normalizePhoneToE164(input);
  if (phone) return { kind: "phone" as const, value: phone };

  ctx.addIssue({ code: "custom", message: "Informe um e-mail ou celular válido." });
  return z.NEVER;
});
const signUpPasswordSchema = z
  .string()
  .min(8)
  .refine(
    (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v),
    t("auth.passwordRule")
  );
const signInPasswordSchema = z.string().min(1);
const nextSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

function safeNext(next: string | undefined) {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next.includes("://")) return null;
  return next;
}

export async function signUpAction(formData: FormData) {
  const next = safeNext(nextSchema.parse(formData.get("next") ?? undefined));
  const nameParsed = nameSchema.safeParse(formData.get("name"));
  if (!nameParsed.success) redirect(next ? `/signup?error=invalid_name&next=${encodeURIComponent(next)}` : "/signup?error=invalid_name");
  const name = nameParsed.data;
  const phoneParsed = phoneSchema.safeParse(formData.get("phone"));
  if (!phoneParsed.success) redirect(next ? `/signup?error=invalid_phone&next=${encodeURIComponent(next)}` : "/signup?error=invalid_phone");
  const phone = phoneParsed.data;
  const emailParsed = emailSchema.safeParse(formData.get("email"));
  if (!emailParsed.success) redirect(next ? `/signup?error=invalid_email&next=${encodeURIComponent(next)}` : "/signup?error=invalid_email");
  const email = emailParsed.data;
  const passwordParsed = signUpPasswordSchema.safeParse(formData.get("password"));
  if (!passwordParsed.success) redirect(next ? `/signup?error=invalid_password&next=${encodeURIComponent(next)}` : "/signup?error=invalid_password");
  const password = passwordParsed.data;
  const orgName = z.string().trim().min(2).max(80).parse(formData.get("orgName") ?? t("org.defaultName"));

  const [existingEmail, existingPhone] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.user.findUnique({ where: { phone }, select: { id: true } }),
  ]);
  if (existingEmail || existingPhone) redirect("/login?error=account_exists");

  const { hash, salt } = newPasswordHash(password);

  const created = await db.organization.create({
    data: {
      name: orgName,
      slug: slugFromRandom(),
      memberships: {
        create: {
          role: "owner",
          user: {
            create: {
              email,
              phone,
              name,
              passwordHash: hash,
              passwordSalt: salt,
            },
          },
        },
      },
      subscription: {
        create: {
          plan: "starter",
          status: "trialing",
          billingCycle: "monthly",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      },
    },
    select: { id: true, memberships: { select: { userId: true }, take: 1 } },
  });

  const userId = created.memberships[0]?.userId;
  if (!userId) redirect("/login?error=unexpected");

  if (process.env.TENANT_DEBUG === "1") console.log("[TENANT] signup", { userId, organizationId: created.id });
  await seedDefaultFinanceForOrganization(created.id);
  await createSessionCookie({ userId, organizationId: created.id });
  redirect(next ?? "/");
}

export async function signInAction(formData: FormData) {
  const next = safeNext(nextSchema.parse(formData.get("next") ?? undefined));
  const identifierParsed = identifierSchema.safeParse(formData.get("identifier"));
  if (!identifierParsed.success) redirect(next ? `/login?error=invalid_identifier&next=${encodeURIComponent(next)}` : "/login?error=invalid_identifier");
  const identifier = identifierParsed.data;
  const password = signInPasswordSchema.parse(formData.get("password"));

  const user =
    identifier.kind === "email"
      ? await db.user.findUnique({
          where: { email: identifier.value },
          select: { id: true, passwordHash: true, passwordSalt: true, phone: true, name: true },
        })
      : await db.user.findUnique({
          where: { phone: identifier.value },
          select: { id: true, passwordHash: true, passwordSalt: true, phone: true, name: true },
        });

  if (!user) redirect("/login?error=invalid_credentials");
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) redirect("/login?error=invalid_credentials");

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, organization: { select: { name: true } } },
  });

  if (!membership) redirect("/login?error=no_workspace");

  await createSessionCookie({ userId: user.id, organizationId: membership.organizationId });
  const orgName = membership.organization?.name ?? "";
  const orgNorm = orgName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const orgPlaceholder = orgNorm === "espaco de trabalho";
  if (!user.phone || !user.name || orgPlaceholder) redirect(next ? `/onboarding/complete?next=${encodeURIComponent(next)}` : "/onboarding/complete");
  redirect(next ?? "/");
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/login");
}

const orgNameSchema = z.string().trim().min(2).max(80);

export async function completeProfileAction(formData: FormData) {
  const next = safeNext(nextSchema.parse(formData.get("next") ?? undefined));
  const auth = await requireAuthContext();

  const nameParsed = nameSchema.safeParse(formData.get("name"));
  if (!nameParsed.success) redirect(next ? `/onboarding/complete?error=invalid_name&next=${encodeURIComponent(next)}` : "/onboarding/complete?error=invalid_name");
  const phoneParsed = phoneSchema.safeParse(formData.get("phone"));
  if (!phoneParsed.success) redirect(next ? `/onboarding/complete?error=invalid_phone&next=${encodeURIComponent(next)}` : "/onboarding/complete?error=invalid_phone");
  const orgNameParsed = orgNameSchema.safeParse(formData.get("orgName"));
  if (!orgNameParsed.success) redirect(next ? `/onboarding/complete?error=invalid_org&next=${encodeURIComponent(next)}` : "/onboarding/complete?error=invalid_org");

  const phone = phoneParsed.data;
  const name = nameParsed.data;
  const orgName = orgNameParsed.data;

  const conflict = await db.user.count({ where: { phone, id: { not: auth.user.id } } });
  if (conflict) redirect(next ? `/onboarding/complete?error=phone_in_use&next=${encodeURIComponent(next)}` : "/onboarding/complete?error=phone_in_use");

  await db.user.updateMany({
    where: { id: auth.user.id },
    data: { phone, name },
  });

  await db.organization.updateMany({
    where: { id: auth.organization.id },
    data: { name: orgName },
  });

  redirect(next ?? "/");
}
