export type WhatsappInboundEvent = {
  phoneNumberId: string | null;
  businessAccountId: string | null;
  externalId: string;
  fromNumber: string | null;
  toNumber: string | null;
  messageType: "text" | "audio" | "image";
  textBody: string | null;
  mediaId: string | null;
  mediaMimeType: string | null;
  raw: unknown;
};

export function parseWhatsappWebhook(payload: unknown): WhatsappInboundEvent[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const entries = Array.isArray(root?.entry) ? (root.entry as unknown[]) : [];
  const out: WhatsappInboundEvent[] = [];

  for (const entry of entries) {
    const entryObj = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
    const changes = Array.isArray(entryObj?.changes) ? (entryObj.changes as unknown[]) : [];
    for (const change of changes) {
      const changeObj = change && typeof change === "object" ? (change as Record<string, unknown>) : null;
      const value = changeObj?.value && typeof changeObj.value === "object" ? (changeObj.value as Record<string, unknown>) : null;
      const messages = Array.isArray(value?.messages) ? (value.messages as unknown[]) : [];
      const metadata = value?.metadata && typeof value.metadata === "object" ? (value.metadata as Record<string, unknown>) : null;
      const phoneNumberId = typeof metadata?.phone_number_id === "string" ? metadata.phone_number_id : null;
      const businessAccountId = typeof entryObj?.id === "string" ? entryObj.id : null;

      for (const msg of messages) {
        const msgObj = msg && typeof msg === "object" ? (msg as Record<string, unknown>) : null;
        const externalId = typeof msgObj?.id === "string" ? msgObj.id : null;
        if (!externalId) continue;
        const fromNumber = typeof msgObj?.from === "string" ? msgObj.from : null;
        const toNumber = typeof phoneNumberId === "string" ? phoneNumberId : null;
        const type = msgObj?.type;

        if (type === "text") {
          const text = msgObj?.text && typeof msgObj.text === "object" ? (msgObj.text as Record<string, unknown>) : null;
          const body = typeof text?.body === "string" ? text.body : null;
          out.push({
            phoneNumberId,
            businessAccountId,
            externalId,
            fromNumber,
            toNumber,
            messageType: "text",
            textBody: body,
            mediaId: null,
            mediaMimeType: null,
            raw: msgObj,
          });
        } else if (type === "audio") {
          const audio = msgObj?.audio && typeof msgObj.audio === "object" ? (msgObj.audio as Record<string, unknown>) : null;
          const mediaId = typeof audio?.id === "string" ? audio.id : null;
          const mime = typeof audio?.mime_type === "string" ? audio.mime_type : null;
          out.push({
            phoneNumberId,
            businessAccountId,
            externalId,
            fromNumber,
            toNumber,
            messageType: "audio",
            textBody: null,
            mediaId,
            mediaMimeType: mime,
            raw: msgObj,
          });
        } else if (type === "image") {
          const image = msgObj?.image && typeof msgObj.image === "object" ? (msgObj.image as Record<string, unknown>) : null;
          const mediaId = typeof image?.id === "string" ? image.id : null;
          const mime = typeof image?.mime_type === "string" ? image.mime_type : null;
          out.push({
            phoneNumberId,
            businessAccountId,
            externalId,
            fromNumber,
            toNumber,
            messageType: "image",
            textBody: null,
            mediaId,
            mediaMimeType: mime,
            raw: msgObj,
          });
        }
      }
    }
  }

  return out;
}
