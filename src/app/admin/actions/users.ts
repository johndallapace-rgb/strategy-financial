"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/app/admin/actions/auth";

const userIdSchema = z.object({ userId: z.string().uuid() });
const membershipIdSchema = z.object({ membershipId: z.string().uuid() });

export async function deactivateUserAction(input: z.input<typeof userIdSchema>) {
  const auth = await requireAdmin();
  const { userId } = userIdSchema.parse(input);

  await db.session.deleteMany({ where: { userId } });

  await db.adminAuditLog.create({
    data: {
      organizationId: auth.organization.id,
      actorUserId: auth.user.id,
      action: "admin.users.deactivate",
      data: { userId },
    },
    select: { id: true },
  });

  revalidatePath("/admin/users");
}

export async function removeUserAccessAction(input: z.input<typeof userIdSchema>) {
  const auth = await requireAdmin();
  const { userId } = userIdSchema.parse(input);

  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.membership.deleteMany({ where: { userId } });
  });

  await db.adminAuditLog.create({
    data: {
      organizationId: auth.organization.id,
      actorUserId: auth.user.id,
      action: "admin.users.remove_access",
      data: { userId },
    },
    select: { id: true },
  });

  revalidatePath("/admin/users");
}

export async function removeMembershipAction(input: z.input<typeof membershipIdSchema>) {
  const auth = await requireAdmin();
  const { membershipId } = membershipIdSchema.parse(input);

  const membership = await db.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, userId: true, organizationId: true },
  });
  if (!membership) return;

  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: membership.userId, organizationId: membership.organizationId } });
    await tx.membership.delete({ where: { id: membership.id } });
  });

  await db.adminAuditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: auth.user.id,
      action: "admin.users.remove_membership",
      data: { membershipId, userId: membership.userId },
    },
    select: { id: true },
  });

  revalidatePath("/admin/users");
}

export async function hardDeleteUserAction(input: z.input<typeof userIdSchema>) {
  const auth = await requireAdmin();
  const { userId } = userIdSchema.parse(input);
  if (userId === auth.user.id) throw new Error("Não é permitido excluir seu próprio usuário.");

  await db.user.delete({ where: { id: userId }, select: { id: true } });

  await db.adminAuditLog.create({
    data: {
      organizationId: auth.organization.id,
      actorUserId: auth.user.id,
      action: "admin.users.hard_delete",
      data: { userId },
    },
    select: { id: true },
  });

  revalidatePath("/admin/users");
}
