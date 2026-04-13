import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionCookie, newPasswordHash } from "@/lib/auth";
import { seedDefaultFinanceForOrganization } from "@/lib/default-finance";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}.`);
  return v;
}

function appUrl() {
  const v = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!v) throw new Error("Missing NEXTAUTH_URL (or NEXT_PUBLIC_APP_URL).");
  return v.replace(/\/$/, "");
}

function redirectWithError(reqUrl: string, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, reqUrl));
}

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

function slugFromRandom() {
  return `ws_${crypto.randomBytes(8).toString("hex")}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) return redirectWithError(req.url, "google_failed");

  let clientId: string;
  let clientSecret: string;
  try {
    clientId = requireEnv("GOOGLE_CLIENT_ID");
    clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
    if (!process.env.NEXTAUTH_URL) requireEnv("NEXT_PUBLIC_APP_URL");
  } catch {
    return redirectWithError(req.url, "google_not_configured");
  }

  const c = await cookies();
  const expectedState = c.get("sf_google_oauth_state")?.value ?? null;
  if (!expectedState || expectedState !== state) return redirectWithError(req.url, "google_failed");

  c.set({
    name: "sf_google_oauth_state",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  const next = c.get("sf_google_oauth_next")?.value ?? null;
  if (next) {
    c.set({
      name: "sf_google_oauth_next",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  }

  const redirectUri = `${appUrl()}/api/auth/callback/google`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return redirectWithError(req.url, "google_failed");

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokens.access_token) return redirectWithError(req.url, "google_failed");

  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) return redirectWithError(req.url, "google_failed");

  const profile = (await userRes.json()) as GoogleUserInfo;
  if (!profile.email) return redirectWithError(req.url, "google_failed");
  if (profile.email_verified === false) return redirectWithError(req.url, "google_email_unverified");

  const email = profile.email.toLowerCase();

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    const membership = await db.membership.findFirst({
      where: { userId: existingUser.id },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    if (!membership) return redirectWithError(req.url, "no_workspace");
    await createSessionCookie({ userId: existingUser.id, organizationId: membership.organizationId });
    return NextResponse.redirect(new URL(next ?? "/", req.url));
  }

  const randomPassword = crypto.randomBytes(24).toString("base64url");
  const { hash, salt } = newPasswordHash(randomPassword);

  const created = await db.organization.create({
    data: {
      name: "Espaço de trabalho",
      slug: slugFromRandom(),
      memberships: {
        create: {
          role: "owner",
          user: {
            create: {
              email,
              phone: null,
              name: profile.name ?? null,
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
  if (!userId) return redirectWithError(req.url, "google_failed");

  if (process.env.TENANT_DEBUG === "1") console.log("[TENANT] google_signup", { userId, organizationId: created.id });
  await seedDefaultFinanceForOrganization(created.id);
  await createSessionCookie({ userId, organizationId: created.id });
  return NextResponse.redirect(new URL(next ?? "/", req.url));
}
