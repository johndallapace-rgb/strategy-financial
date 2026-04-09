import "dotenv/config";
import { db } from "../src/lib/db";

const EMAIL = "joao.pace@dpautomacao.com.br";

async function main() {
  const user = await db.user.findUnique({
    where: { email: EMAIL },
    select: {
      id: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        select: {
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              createdAt: true,
              _count: {
                select: {
                  memberships: true,
                  accounts: true,
                  categories: true,
                  transactions: true,
                  recurring: true,
                  alertRules: true,
                  invites: true,
                  sessions: true,
                },
              },
              memberships: {
                select: { userId: true, role: true, user: { select: { email: true, phone: true } } },
                orderBy: [{ role: "asc" }, { createdAt: "asc" }],
                take: 50,
              },
            },
          },
        },
      },
      sessions: { select: { id: true }, take: 5 },
      invitesCreated: { select: { id: true }, take: 5 },
      invitesAccepted: { select: { id: true }, take: 5 },
    },
  });

  if (!user) {
    console.log(JSON.stringify({ ok: true, found: false, email: EMAIL }, null, 2));
    return;
  }

  const orgs = user.memberships.map((m) => m.organization);
  const orgIds = Array.from(new Set(orgs.map((o) => o.id)));

  const cleanupPlan = await Promise.all(
    orgIds.map(async (organizationId) => {
      const organization = orgs.find((o) => o.id === organizationId)!;
      const membership = user.memberships.find((m) => m.organization.id === organizationId)!;
      const ownerCount = await db.membership.count({ where: { organizationId, role: "owner" } });
      const otherOwnerCount = await db.membership.count({
        where: { organizationId, role: "owner", userId: { not: user.id } },
      });
      const isSoleMember = organization._count.memberships === 1;
      const isDefaultOrg = organization.slug === "default";

      return {
        organizationId,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        membershipRole: membership.role,
        isDefaultOrg,
        isSoleMember,
        ownerCount,
        otherOwnerCount,
        counts: organization._count,
        members: organization.memberships.map((mm) => ({
          userId: mm.userId,
          role: mm.role,
          identifier: mm.user.email ?? mm.user.phone ?? null,
        })),
      };
    })
  );

  const plan = {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      sessionCountSample: user.sessions.length,
      invitesCreatedSample: user.invitesCreated.length,
      invitesAcceptedSample: user.invitesAccepted.length,
    },
    orgs: cleanupPlan,
  };

  console.log(JSON.stringify({ ok: true, found: true, plan }, null, 2));

  const deletableOrgIds = cleanupPlan
    .filter((o) => o.isSoleMember && !o.isDefaultOrg)
    .map((o) => o.organizationId);

  const sharedOrgs = cleanupPlan.filter((o) => !o.isSoleMember);

  const reassigned: Array<{ organizationId: string; fromUserId: string; toUserId: string }> = [];
  const membershipsDeleted: Array<{ organizationId: string; userId: string }> = [];
  const orgsDeleted: Array<{ organizationId: string }> = [];

  await db.$transaction(async (tx) => {
    if (deletableOrgIds.length) {
      await tx.organization.deleteMany({ where: { id: { in: deletableOrgIds } } });
      for (const id of deletableOrgIds) orgsDeleted.push({ organizationId: id });
    }

    for (const org of sharedOrgs) {
      if (org.otherOwnerCount === 0 && org.membershipRole === "owner") {
        const candidate = await tx.membership.findFirst({
          where: { organizationId: org.organizationId, userId: { not: user.id } },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: { userId: true },
        });
        if (candidate) {
          await tx.membership.updateMany({
            where: { organizationId: org.organizationId, userId: candidate.userId },
            data: { role: "owner" },
          });
          reassigned.push({ organizationId: org.organizationId, fromUserId: user.id, toUserId: candidate.userId });
        }
      }

      await tx.membership.deleteMany({ where: { organizationId: org.organizationId, userId: user.id } });
      membershipsDeleted.push({ organizationId: org.organizationId, userId: user.id });
    }

    await tx.user.delete({ where: { id: user.id } });
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        deletedUserId: user.id,
        deletedOrganizations: orgsDeleted,
        deletedMemberships: membershipsDeleted,
        reassignedOwners: reassigned,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

