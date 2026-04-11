import crypto from "node:crypto";

export function verifyWhatsAppSignature({
  rawBody,
  signatureHeader,
  appSecret,
}: {
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string | null;
}) {
  const isProd = process.env.NODE_ENV === "production";
  const secret = appSecret?.trim() || null;
  if (!secret)
    return isProd
      ? ({ ok: false as const, reason: "missing_secret" as const } as const)
      : ({ ok: true as const, reason: "no_secret" as const } as const);
  if (!signatureHeader) return { ok: false as const, reason: "missing_signature" as const };

  const m = /^sha256=(.+)$/i.exec(signatureHeader.trim());
  if (!m) return { ok: false as const, reason: "invalid_signature" as const };

  const provided = m[1] ?? "";
  if (!/^[0-9a-f]{64}$/i.test(provided)) return { ok: false as const, reason: "invalid_signature" as const };
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return { ok: false as const, reason: "invalid_signature" as const };
  const ok = crypto.timingSafeEqual(a, b);
  return ok ? ({ ok: true as const, reason: "verified" as const } as const) : ({ ok: false as const, reason: "invalid_signature" as const } as const);
}
