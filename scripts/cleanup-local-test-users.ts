import "dotenv/config";
import { db } from "../src/lib/db";

const DEFAULT_KEEP_EMAIL = "j.c.d.pace@gmail.com";

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
  const keepEmail = (getArgValue("--keep-email") || DEFAULT_KEEP_EMAIL).trim().toLowerCase();

  const keepUser = await db.user.findUnique({
    where: { email: keepEmail },
    select: { id: true, email: true },
  });
  if (!keepUser) throw new Error(`Usuário para preservar não encontrado: ${keepEmail}`);

  const users = await db.user.findMany({
    where: { id: { not: keepUser.id } },
    select: { id: true, email: true, phone: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }],
  });

  const deleteIds = users.map((u) => u.id);
  const deleteEmails = users.map((u) => u.email ?? u.phone ?? "—");

  const [sessionCounts, membershipCounts, aiCounts, usageCounts, auditCounts] = await Promise.all([
    deleteIds.length
      ? db.session.groupBy({ by: ["userId"], where: { userId: { in: deleteIds } }, _count: { _all: true } })
      : Promise.resolve([]),
    deleteIds.length
      ? db.membership.groupBy({ by: ["userId"], where: { userId: { in: deleteIds } }, _count: { _all: true } })
      : Promise.resolve([]),
    deleteIds.length
      ? db.aiExtraction.groupBy({ by: ["userId"], where: { userId: { in: deleteIds } }, _count: { _all: true } })
      : Promise.resolve([]),
    deleteIds.length
      ? db.usageMetric.groupBy({ by: ["userId"], where: { userId: { in: deleteIds } }, _count: { _all: true } })
      : Promise.resolve([]),
    deleteIds.length
      ? db.adminAuditLog.groupBy({ by: ["actorUserId"], where: { actorUserId: { in: deleteIds } }, _count: { _all: true } })
      : Promise.resolve([]),
  ]);

  const plan = {
    keep: { id: keepUser.id, email: keepUser.email },
    deleteUserCount: deleteIds.length,
    deleteIdentifiers: deleteEmails,
    dependentCounts: {
      sessions: sessionCounts.reduce((acc, x) => acc + x._count._all, 0),
      memberships: membershipCounts.reduce((acc, x) => acc + x._count._all, 0),
      aiExtractions: aiCounts.reduce((acc, x) => acc + x._count._all, 0),
      usageMetrics: usageCounts.reduce((acc, x) => acc + x._count._all, 0),
      adminAuditLogs: auditCounts.reduce((acc, x) => acc + x._count._all, 0),
    },
    mode: apply ? "apply" : "preview",
  };

  console.log(JSON.stringify({ ok: true, plan }, null, 2));

  if (!apply) return;
  if (deleteIds.length === 0) return;

  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: { in: deleteIds } } });
    await tx.membership.deleteMany({ where: { userId: { in: deleteIds } } });
    await tx.aiExtraction.deleteMany({ where: { userId: { in: deleteIds } } });
    await tx.usageMetric.deleteMany({ where: { userId: { in: deleteIds } } });
    await tx.adminAuditLog.deleteMany({ where: { actorUserId: { in: deleteIds } } });
    await tx.organizationInvite.deleteMany({
      where: {
        OR: [{ invitedByUserId: { in: deleteIds } }, { acceptedByUserId: { in: deleteIds } }],
      },
    });
    await tx.user.deleteMany({ where: { id: { in: deleteIds } } });
  });

  const stillThere = await db.user.findUnique({ where: { id: keepUser.id }, select: { id: true, email: true } });
  if (!stillThere) throw new Error("Falha crítica: usuário preservado não existe mais após a limpeza.");

  const keepMemberships = await db.membership.count({ where: { userId: keepUser.id } });
  console.log(JSON.stringify({ ok: true, applied: true, keptUser: stillThere, keptMembershipCount: keepMemberships }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

