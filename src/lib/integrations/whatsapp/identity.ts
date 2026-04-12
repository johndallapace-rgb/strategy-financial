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
    return db.user.findFirst({
      where: {
        OR: [{ phone: { endsWith: identity.phoneDigits } }, { phone: identity.phoneDigits }, { phone: `+${identity.phoneDigits}` }],
      },
      select: { id: true, phone: true, whatsappUserId: true, whatsappUsername: true },
    });
  }

  if (enableBsuidFallback && identity.whatsappUserId) {
    return db.user.findFirst({
      where: { whatsappUserId: identity.whatsappUserId },
      select: { id: true, phone: true, whatsappUserId: true, whatsappUsername: true },
    });
  }

  return null;
}
