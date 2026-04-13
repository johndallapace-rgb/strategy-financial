import crypto from "crypto";
import { db } from "@/lib/db";

function sha256Base64Url(value: string) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

export type EnterpriseAuthContext = {
  organizationId: string;
  credentialId: string;
  scopes: string[];
};

export async function requireEnterpriseAuth(req: Request, requiredScope: string): Promise<EnterpriseAuthContext> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) throw new Error("unauthorized");

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("unauthorized");
  const apiKey = match[1]?.trim();
  if (!apiKey) throw new Error("unauthorized");

  const apiKeyHash = sha256Base64Url(apiKey);
  const cred = await db.apiCredential.findUnique({
    where: { apiKeyHash },
    select: { id: true, organizationId: true, status: true, scopes: true },
  });

  if (!cred || cred.status !== "active") throw new Error("unauthorized");
  if (!cred.scopes.includes(requiredScope)) throw new Error("forbidden");

  return { organizationId: cred.organizationId, credentialId: cred.id, scopes: cred.scopes };
}
