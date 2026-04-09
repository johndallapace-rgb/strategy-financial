import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const SESSION_COOKIE = "sf_session";
const SESSION_DAYS = 30;

function sha256Base64Url(input: string) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

export function newPasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export type AuthContext = {
  user: { id: string; email: string | null; phone: string | null; name: string | null };
  organization: { id: string; name: string; slug: string };
  role: "owner" | "admin" | "member";
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = sha256Base64Url(token);
  const session = await db.session.findUnique({
    where: { tokenHash },
    select: {
      userId: true,
      organizationId: true,
      expiresAt: true,
      user: { select: { id: true, email: true, phone: true, name: true } },
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;

  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId: session.organizationId, userId: session.userId } },
    select: { role: true },
  });

  if (!membership) return null;

  return {
    user: session.user,
    organization: session.organization,
    role: membership.role,
  };
}

export async function requireAuthContext() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function createSessionCookie(params: { userId: string; organizationId: string }) {
  const token = randomToken();
  const tokenHash = sha256Base64Url(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      tokenHash,
      userId: params.userId,
      organizationId: params.organizationId,
      expiresAt,
    },
  });

  (await cookies()).set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = sha256Base64Url(token);
    await db.session.deleteMany({ where: { tokenHash } });
  }

  (await cookies()).set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionTokenHashFromCookies() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return sha256Base64Url(token);
}
