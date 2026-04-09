"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";
import { t } from "@/lib/i18n";

function sha256Base64Url(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

function randomToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function requireTeamAdmin(role: "owner" | "admin" | "member") {
  if (role === "member") throw new Error("Sem permissão.");
}

const emailSchema = z.string().trim().toLowerCase().email();
const roleSchema = z.enum(["owner", "admin", "member"]);
const inviteCodeSchema = z.string().trim().min(20);

export type CreateInviteState = { token?: string; error?: string } | null;

export async function createInviteAction(_: CreateInviteState, formData: FormData): Promise<CreateInviteState> {
  const auth = await requireAuthContext();
  requireTeamAdmin(auth.role);

  const email = emailSchema.safeParse(formData.get("email"));
  const role = roleSchema.safeParse(formData.get("role"));
  if (!email.success || !role.success) return { error: "Dados inválidos." };

  if (auth.role !== "owner" && role.data === "owner") return { error: t("team.ownerOnlyInviteOwner") };

  const existingUser = await db.user.findUnique({ where: { email: email.data }, select: { id: true } });
  if (existingUser) {
    const alreadyMember = await db.membership.count({
      where: { organizationId: auth.organization.id, userId: existingUser.id },
    });
    if (alreadyMember) return { error: "Este usuário já faz parte desta empresa." };
  }

  const token = `sf_inv_${randomToken()}`;
  const tokenHash = sha256Base64Url(token);

  await db.organizationInvite.create({
    data: {
      organizationId: auth.organization.id,
      invitedByUserId: auth.user.id,
      email: email.data,
      role: role.data,
      tokenHash,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });

  revalidatePath("/settings");
  return { token };
}

export type AcceptInviteState = { ok?: true; organizationId?: string; error?: string } | null;

export async function acceptInviteAction(_: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const auth = await requireAuthContext();
  const code = inviteCodeSchema.safeParse(formData.get("code"));
  if (!code.success) return { error: "Código inválido." };

  const tokenHash = sha256Base64Url(code.data);
  const invite = await db.organizationInvite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      organizationId: true,
      role: true,
      email: true,
      expiresAt: true,
      acceptedAt: true,
    },
  });

  if (!invite) return { error: "Convite não encontrado." };
  if (invite.email !== auth.user.email) return { error: "Este convite foi enviado para outro e-mail." };
  if (invite.acceptedAt) {
    const isMember = await db.membership.count({
      where: { organizationId: invite.organizationId, userId: auth.user.id },
    });
    if (isMember) return { ok: true, organizationId: invite.organizationId };
    return { error: "Este convite já foi utilizado." };
  }
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) return { error: "Este convite expirou." };

  await db.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: auth.user.id } },
      create: { organizationId: invite.organizationId, userId: auth.user.id, role: invite.role },
      update: {},
    });

    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedByUserId: auth.user.id },
    });
  });

  return { ok: true, organizationId: invite.organizationId };
}

export async function revokeInviteAction(formData: FormData) {
  const auth = await requireAuthContext();
  requireTeamAdmin(auth.role);

  const inviteId = z.string().uuid().parse(formData.get("inviteId"));
  await db.organizationInvite.deleteMany({
    where: { id: inviteId, organizationId: auth.organization.id, acceptedAt: null },
  });

  revalidatePath("/settings");
}

export async function updateMemberRoleAction(formData: FormData) {
  const auth = await requireAuthContext();
  requireTeamAdmin(auth.role);

  const userId = z.string().uuid().parse(formData.get("userId"));
  const nextRole = roleSchema.parse(formData.get("role"));

  const current = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId: auth.organization.id, userId } },
    select: { role: true },
  });
  if (!current) throw new Error("Membro não encontrado.");

  if (auth.role !== "owner" && (current.role === "owner" || nextRole === "owner")) {
    throw new Error(t("team.ownerOnlyManageOwners"));
  }

  if (current.role === "owner" && nextRole !== "owner") {
    const owners = await db.membership.count({ where: { organizationId: auth.organization.id, role: "owner" } });
    if (owners <= 1) throw new Error(t("team.cannotRemoveLastOwner"));
  }

  await db.membership.updateMany({
    where: { organizationId: auth.organization.id, userId },
    data: { role: nextRole },
  });

  revalidatePath("/settings");
}

export async function removeMemberAction(formData: FormData) {
  const auth = await requireAuthContext();
  requireTeamAdmin(auth.role);

  const userId = z.string().uuid().parse(formData.get("userId"));
  if (userId === auth.user.id) throw new Error("Você não pode remover sua própria conta aqui.");

  const current = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId: auth.organization.id, userId } },
    select: { role: true },
  });
  if (!current) throw new Error("Membro não encontrado.");

  if (auth.role !== "owner" && current.role === "owner") throw new Error(t("team.ownerOnlyRemoveOwner"));

  if (current.role === "owner") {
    const owners = await db.membership.count({ where: { organizationId: auth.organization.id, role: "owner" } });
    if (owners <= 1) throw new Error(t("team.cannotRemoveLastOwner"));
  }

  await db.membership.deleteMany({ where: { organizationId: auth.organization.id, userId } });
  revalidatePath("/settings");
}
