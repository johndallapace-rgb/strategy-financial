export type WhatsappRecipient =
  | { kind: "phone"; to: string }
  | { kind: "bsuid"; recipientUserId: string };

export function buildWhatsappRecipient(input: { toPhone?: string | null; whatsappUserId?: string | null }): WhatsappRecipient | null {
  if (input.toPhone && input.toPhone.trim().length > 0) return { kind: "phone", to: input.toPhone };
  if (input.whatsappUserId && input.whatsappUserId.trim().length > 0) return { kind: "bsuid", recipientUserId: input.whatsappUserId };
  return null;
}

