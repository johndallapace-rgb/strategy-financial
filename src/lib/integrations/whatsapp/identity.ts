import { db } from "@/lib/db";
import type { WhatsappInboundEvent } from "@/lib/integrations/whatsapp/parse";

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

export type WhatsappIdentity = {
  phoneDigits: string | null;
  whatsappUserId: string | null;
  whatsappUsername: string | null;
};

export function getWhatsappIdentity(event: Pick<WhatsappInboundEvent, "fromNumber" | "whatsappUserId" | "whatsappUsername">): WhatsappIdentity {
  const phoneDigits = event.fromNumber ? digitsOnly(event.fromNumber) : null;
  return {
    phoneDigits: phoneDigits && phoneDigits.length > 0 ? phoneDigits : null,
    whatsappUserId: event.whatsappUserId ?? null,
    whatsappUsername: event.whatsappUsername ?? null,
  };
}

export async function resolveUserForCentralInbound({
  identity,
  enableBsuidFallback,
}: {
  identity: WhatsappIdentity;
  enableBsuidFallback: boolean;
}) {
  if (identity.phoneDigits) {
    const users = await db.user.findMany({
      where: {
        OR: [{ phone: { endsWith: identity.phoneDigits } }, { phone: identity.phoneDigits }, { phone: `+${identity.phoneDigits}` }],
      },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: { id: true, email: true, phone: true, whatsappUserId: true, whatsappUsername: true },
    });
    if (users.length !== 1) return null;
    return users[0];
  }

  if (enableBsuidFallback && identity.whatsappUserId) {
    const users = await db.user.findMany({
      where: { whatsappUserId: identity.whatsappUserId },
      orderBy: { createdAt: "asc" },
      take: 2,
      select: { id: true, email: true, phone: true, whatsappUserId: true, whatsappUsername: true },
    });
    if (users.length !== 1) return null;
    return users[0];
  }

  return null;
}
