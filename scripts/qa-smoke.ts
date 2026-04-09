import "dotenv/config";
import crypto from "node:crypto";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const BASE_URL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";

function sha256Base64Url(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function slugFromRandom() {
  return `ws_${crypto.randomBytes(8).toString("hex")}`;
}

function nowIsoCompact() {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

type HttpResult = { status: number; location?: string | null; text: string; json?: unknown };

async function http(
  path: string,
  opts: {
    method?: "GET" | "POST";
    cookie?: string;
    jsonBody?: unknown;
    redirect?: RequestRedirect;
  } = {}
): Promise<HttpResult> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = `sf_session=${opts.cookie}`;
  if (opts.jsonBody !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.jsonBody !== undefined ? JSON.stringify(opts.jsonBody) : undefined,
    redirect: opts.redirect ?? "manual",
  });

  const location = res.headers.get("location");
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  const json = contentType.includes("application/json")
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return undefined;
        }
      })()
    : undefined;

  return { status: res.status, location, text, json };
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  assert(dbUrl, "DATABASE_URL is missing.");

  const pool = new Pool({ connectionString: dbUrl });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const runId = nowIsoCompact();
  const emailA = `qa.usera.${runId}@example.com`;
  const emailB = `qa.userb.${runId}@example.com`;
  const emailC = `qa.userc.${runId}@example.com`;

  const created = {
    orgA: null as null | { id: string; name: string },
    orgB: null as null | { id: string; name: string },
    orgC: null as null | { id: string; name: string },
    userA: null as null | { id: string; email: string },
    userB: null as null | { id: string; email: string },
    userC: null as null | { id: string; email: string },
  };

  async function createSession(params: { userId: string; organizationId: string }) {
    const token = randomToken();
    const tokenHash = sha256Base64Url(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.session.create({
      data: { tokenHash, userId: params.userId, organizationId: params.organizationId, expiresAt },
      select: { id: true },
    });
    return token;
  }

  try {
    console.log(`QA smoke against ${BASE_URL}`);

    created.orgA = await db.organization.create({
      data: { name: `QA Org A ${runId}`, slug: slugFromRandom() },
      select: { id: true, name: true },
    });
    created.orgB = await db.organization.create({
      data: { name: `QA Org B ${runId}`, slug: slugFromRandom() },
      select: { id: true, name: true },
    });
    created.orgC = await db.organization.create({
      data: { name: `QA Org C (inactive) ${runId}`, slug: slugFromRandom() },
      select: { id: true, name: true },
    });

    const userA = await db.user.create({
      data: { email: emailA, name: null, passwordHash: "x", passwordSalt: "x" },
      select: { id: true, email: true },
    });
    if (!userA.email) throw new Error("QA: expected userA email to be set.");
    created.userA = { id: userA.id, email: userA.email };

    const userB = await db.user.create({
      data: { email: emailB, name: null, passwordHash: "x", passwordSalt: "x" },
      select: { id: true, email: true },
    });
    if (!userB.email) throw new Error("QA: expected userB email to be set.");
    created.userB = { id: userB.id, email: userB.email };

    const userC = await db.user.create({
      data: { email: emailC, name: null, passwordHash: "x", passwordSalt: "x" },
      select: { id: true, email: true },
    });
    if (!userC.email) throw new Error("QA: expected userC email to be set.");
    created.userC = { id: userC.id, email: userC.email };

    await db.membership.createMany({
      data: [
        { organizationId: created.orgA.id, userId: created.userA.id, role: "owner" },
        { organizationId: created.orgB.id, userId: created.userB.id, role: "owner" },
        { organizationId: created.orgC.id, userId: created.userC.id, role: "owner" },
      ],
    });

    await db.subscription.createMany({
      data: [
        {
          organizationId: created.orgA.id,
          plan: "starter",
          status: "trialing",
          billingCycle: "monthly",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        {
          organizationId: created.orgB.id,
          plan: "starter",
          status: "active",
          billingCycle: "monthly",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        {
          organizationId: created.orgC.id,
          plan: "starter",
          status: "inactive",
          billingCycle: "monthly",
        },
      ],
    });

    const inviteToken = `sf_inv_${crypto.randomBytes(24).toString("base64url")}`;
    const inviteTokenHash = sha256Base64Url(inviteToken);
    await db.organizationInvite.create({
      data: {
        organizationId: created.orgA.id,
        invitedByUserId: created.userA.id,
        email: created.userB.email,
        role: "member",
        tokenHash: inviteTokenHash,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });

    const cookieB = await createSession({ userId: created.userB.id, organizationId: created.orgB.id });
    const cookieC = await createSession({ userId: created.userC.id, organizationId: created.orgC.id });

    {
      const r = await http("/api/session", { cookie: cookieB });
      assert(r.status === 200, `GET /api/session expected 200, got ${r.status}`);
      const data = r.json as unknown as { organization?: { id?: string }; organizations?: Array<unknown> };
      assert(data?.organization?.id === created.orgB.id, "session org should start as orgB for userB.");
      assert(Array.isArray(data?.organizations) && data.organizations.length === 1, "userB should have 1 org before invite.");
      console.log("OK: /api/session returns current org and org list.");
    }

    {
      const r = await http(`/invite?code=${encodeURIComponent(inviteToken)}`, { cookie: cookieB });
      assert(r.status >= 300 && r.status < 400, `GET /invite should redirect, got ${r.status}`);
      assert(r.location === "/", `GET /invite expected Location '/', got '${r.location}'`);
      console.log("OK: invite link acceptance redirects to /.");
    }

    {
      const r = await http("/api/session", { cookie: cookieB });
      assert(r.status === 200, `GET /api/session expected 200, got ${r.status}`);
      const data = r.json as unknown as { organization?: { id?: string }; organizations?: Array<unknown> };
      assert(data?.organization?.id === created.orgA.id, "invite flow should switch session org to orgA.");
      assert(Array.isArray(data?.organizations) && data.organizations.length === 2, "userB should have 2 orgs after invite.");
      console.log("OK: invite acceptance adds membership and switches session org.");
    }

    {
      const r = await http("/api/session/organization", {
        method: "POST",
        cookie: cookieB,
        jsonBody: { organizationId: created.orgB.id },
      });
      assert(r.status === 200, `POST /api/session/organization expected 200, got ${r.status}`);

      const check = await http("/api/session", { cookie: cookieB });
      const data = check.json as unknown as { organization?: { id?: string } };
      assert(data?.organization?.id === created.orgB.id, "org switch should update session org to orgB.");
      console.log("OK: org switching works and updates session.");
    }

    {
      const r = await http("/api/session/organization", {
        method: "POST",
        cookie: cookieB,
        jsonBody: { organizationId: created.orgC.id },
      });
      assert(r.status === 403, `POST /api/session/organization expected 403 for unauthorized org, got ${r.status}`);
      console.log("OK: org switching prevents unauthorized org access.");
    }

    const date = new Date();
    const txnAName = `QA txn A ${runId}`;
    const txnBName = `QA txn B ${runId}`;

    const accountA = await db.account.create({
      data: { organizationId: created.orgA.id, name: "QA PF", type: "pf" },
      select: { id: true },
    });
    const categoryA = await db.category.create({
      data: { organizationId: created.orgA.id, name: "QA", type: "expense", color: "#64748B", icon: "tag" },
      select: { id: true },
    });
    await db.transaction.create({
      data: {
        organizationId: created.orgA.id,
        name: txnAName,
        amount: "123.45",
        type: "expense",
        date,
        isFixed: false,
        isVariable: true,
        entityType: "pf",
        source: "QA",
        categoryId: categoryA.id,
        accountId: accountA.id,
        notes: null,
        recurringRuleId: null,
      },
      select: { id: true },
    });

    const accountB = await db.account.create({
      data: { organizationId: created.orgB.id, name: "QA PF", type: "pf" },
      select: { id: true },
    });
    const categoryB = await db.category.create({
      data: { organizationId: created.orgB.id, name: "QA", type: "expense", color: "#64748B", icon: "tag" },
      select: { id: true },
    });
    await db.transaction.create({
      data: {
        organizationId: created.orgB.id,
        name: txnBName,
        amount: "222.22",
        type: "expense",
        date,
        isFixed: false,
        isVariable: true,
        entityType: "pf",
        source: "QA",
        categoryId: categoryB.id,
        accountId: accountB.id,
        notes: null,
        recurringRuleId: null,
      },
      select: { id: true },
    });

    {
      const r = await http("/transactions", { cookie: cookieB });
      assert(r.status === 200, `GET /transactions expected 200, got ${r.status}`);
      assert(r.text.includes(txnBName), "orgB transactions page should include orgB txn.");
      assert(!r.text.includes(txnAName), "orgB transactions page must not include orgA txn (tenant isolation).");
      console.log("OK: tenant isolation validated on /transactions HTML.");
    }

    {
      await http("/api/session/organization", {
        method: "POST",
        cookie: cookieB,
        jsonBody: { organizationId: created.orgA.id },
      });
      const r = await http("/transactions", { cookie: cookieB });
      assert(r.status === 200, `GET /transactions expected 200, got ${r.status}`);
      assert(r.text.includes(txnAName), "orgA transactions page should include orgA txn.");
      assert(!r.text.includes(txnBName), "orgA transactions page must not include orgB txn (tenant isolation).");
      console.log("OK: tenant isolation validated after org switch.");
    }

    {
      const r = await http("/", { cookie: cookieC });
      assert(r.status >= 300 && r.status < 400, `GET / expected redirect for inactive sub, got ${r.status}`);
      assert(r.location === "/billing", `GET / expected redirect to /billing, got '${r.location}'`);

      const b = await http("/billing", { cookie: cookieC, redirect: "manual" });
      assert(b.status === 200, `GET /billing expected 200, got ${b.status}`);
      assert(b.text.includes("Assinatura necessária"), "/billing content should render and not loop.");
      console.log("OK: subscription gating redirects to /billing without loops.");
    }

    {
      const r = await http("/api/logout", { method: "POST", cookie: cookieB });
      assert(r.status === 200, `POST /api/logout expected 200, got ${r.status}`);

      const check = await http("/api/session", { cookie: cookieB });
      assert(check.status === 401, `GET /api/session after logout expected 401, got ${check.status}`);
      console.log("OK: logout clears session server-side.");
    }

    {
      const r = await http("/transactions?qa=1", { redirect: "manual" });
      assert(r.status >= 300 && r.status < 400, `GET /transactions (no cookie) expected redirect, got ${r.status}`);
      assert(r.location?.startsWith("/login"), `GET /transactions (no cookie) should redirect to /login, got '${r.location}'`);
      assert(r.location?.includes("next="), `GET /transactions (no cookie) should include next=..., got '${r.location}'`);
      console.log("OK: auth middleware redirects unauthenticated users with next param.");
    }

    console.log("QA smoke: PASS");
  } finally {
    try {
      const orgIds = [created.orgA?.id, created.orgB?.id, created.orgC?.id].filter(Boolean) as string[];
      const userIds = [created.userA?.id, created.userB?.id, created.userC?.id].filter(Boolean) as string[];
      if (orgIds.length) await db.organization.deleteMany({ where: { id: { in: orgIds } } });
      if (userIds.length) await db.user.deleteMany({ where: { id: { in: userIds } } });
    } catch (e) {
      console.error("Cleanup failed:", e);
      process.exitCode = 2;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
