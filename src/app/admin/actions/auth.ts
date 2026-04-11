"use server";

import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";

export async function requireAdmin() {
  const auth = await requireAuthContext();
  const adminEmail = process.env.ADMIN_EMAIL || null;
  const isDev = process.env.NODE_ENV !== "production";
  
  const allowedByEmail = Boolean(
    adminEmail && auth.user.email && auth.user.email.toLowerCase() === adminEmail.toLowerCase()
  );

  // Em desenvolvimento, permite acesso temporário a owner/admin para facilitar testes
  const allowedByDevFallback = isDev && (auth.role === "owner" || auth.role === "admin");

  const allowed = allowedByEmail || allowedByDevFallback;
  
  if (!allowed) redirect("/");
  return auth;
}
