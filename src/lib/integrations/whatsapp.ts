export type WhatsAppInboundMessage = {
  from: string;
  text: string;
  receivedAt: Date;
};

export type TransactionDraft = {
  name: string;
  amount: string;
  type: "income" | "expense";
  entityType: "pf" | "pj";
  source: string;
  date: string;
  categoryId?: string;
  notes?: string;
};

export interface WhatsAppParser {
  parse(message: WhatsAppInboundMessage): TransactionDraft | null;
}

