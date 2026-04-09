"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { clearSessionCookie, createSessionCookie, newPasswordHash, verifyPassword } from "@/lib/auth";
import { t } from "@/lib/i18n";

function slugFromRandom() {
  return `ws_${crypto.randomBytes(8).toString("hex")}`;
}

function normalizeBrazilPhoneToE164(input: string) {
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if ((local.length === 12 || local.length === 13) && local.startsWith("55")) local = local.slice(2);
  if (local.length !== 10 && local.length !== 11) return null;
  if (local.startsWith("0")) return null;
  return `+55${local}`;
}

const identifierSchema = z.string().trim().min(1).transform((raw, ctx) => {
  let input = raw.trim();
  if (/^mailto:/i.test(input)) input = input.slice(7).trim();

  if (input.includes("@")) {
    const asEmail = z.string().trim().toLowerCase().email().safeParse(input);
    if (asEmail.success) return { kind: "email" as const, value: asEmail.data };
    ctx.addIssue({ code: "custom", message: "Informe um e-mail ou celular válido." });
    return z.NEVER;
  }

  const phone = normalizeBrazilPhoneToE164(input);
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
  const identifierParsed = identifierSchema.safeParse(formData.get("identifier"));
  if (!identifierParsed.success) redirect(next ? `/signup?error=invalid_identifier&next=${encodeURIComponent(next)}` : "/signup?error=invalid_identifier");
  const identifier = identifierParsed.data;
  const passwordParsed = signUpPasswordSchema.safeParse(formData.get("password"));
  if (!passwordParsed.success) redirect(next ? `/signup?error=invalid_password&next=${encodeURIComponent(next)}` : "/signup?error=invalid_password");
  const password = passwordParsed.data;
  const orgName = z.string().trim().min(2).max(80).parse(formData.get("orgName") ?? t("org.defaultName"));

  const existing =
    identifier.kind === "email"
      ? await db.user.findUnique({ where: { email: identifier.value }, select: { id: true } })
      : await db.user.findUnique({ where: { phone: identifier.value }, select: { id: true } });
  if (existing) redirect("/login?error=account_exists");

  const { hash, salt } = newPasswordHash(password);

  const defaultOrg = await db.organization.findUnique({
    where: { slug: "default" },
    select: { id: true, _count: { select: { memberships: true } } },
  });

  if (defaultOrg && defaultOrg._count.memberships === 0) {
    const { userId, organizationId } = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: identifier.kind === "email" ? identifier.value : null,
          phone: identifier.kind === "phone" ? identifier.value : null,
          name: null,
          passwordHash: hash,
          passwordSalt: salt,
        },
        select: { id: true },
      });

      await tx.membership.create({
        data: { role: "owner", userId: user.id, organizationId: defaultOrg.id },
      });

      await tx.subscription.upsert({
        where: { organizationId: defaultOrg.id },
        update: {},
        create: {
          organizationId: defaultOrg.id,
          plan: "starter",
          status: "trialing",
          billingCycle: "monthly",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      return { userId: user.id, organizationId: defaultOrg.id };
    });

    await createSessionCookie({ userId, organizationId });
    redirect(next ?? "/");
  }

  const created = await db.organization.create({
    data: {
      name: orgName,
      slug: slugFromRandom(),
      memberships: {
        create: {
          role: "owner",
          user: {
            create: {
              email: identifier.kind === "email" ? identifier.value : null,
              phone: identifier.kind === "phone" ? identifier.value : null,
              name: null,
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
          select: { id: true, passwordHash: true, passwordSalt: true },
        })
      : await db.user.findUnique({
          where: { phone: identifier.value },
          select: { id: true, passwordHash: true, passwordSalt: true },
        });

  if (!user) redirect("/login?error=invalid_credentials");
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) redirect("/login?error=invalid_credentials");

  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });

  if (!membership) redirect("/login?error=no_workspace");

  await createSessionCookie({ userId: user.id, organizationId: membership.organizationId });
  redirect(next ?? "/");
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/login");
}
