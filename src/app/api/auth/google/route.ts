import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}.`);
  return v;
}

function appUrl() {
  return requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
}

function safeNext(next: string | null) {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next.includes("://")) return null;
  return next;
}

export async function GET(req: Request) {
  let clientId: string;
  try {
    clientId = requireEnv("GOOGLE_CLIENT_ID");
    requireEnv("GOOGLE_CLIENT_SECRET");
    requireEnv("NEXT_PUBLIC_APP_URL");
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }

  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));

  const state = crypto.randomBytes(24).toString("base64url");
  const c = await cookies();

  c.set({
    name: "sf_google_oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 10 * 60 * 1000),
  });

  if (next) {
    c.set({
      name: "sf_google_oauth_next",
      value: next,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 10 * 60 * 1000),
    });
  }

  const redirectUri = `${appUrl()}/api/auth/google/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authUrl);
}

