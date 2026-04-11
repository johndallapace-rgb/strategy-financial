export type PlanKey = "free" | "basic" | "pro";

export type PlanLimits = {
  whatsappMessagesPerMonth: number;
  draftsPerMonth: number;
  aiRunsPerMonth: number;
  features: {
    whatsappAudio: boolean;
    whatsappImage: boolean;
    autoReply: boolean;
    memoryLong: boolean;
    multiAgent: boolean;
  };
};

const limits: Record<PlanKey, PlanLimits> = {
  free: {
    whatsappMessagesPerMonth: 100,
    draftsPerMonth: 100,
    aiRunsPerMonth: 50,
    features: {
      whatsappAudio: false,
      whatsappImage: false,
      autoReply: false,
      memoryLong: false,
      multiAgent: false,
    },
  },
  basic: {
    whatsappMessagesPerMonth: 1000,
    draftsPerMonth: 1000,
    aiRunsPerMonth: 600,
    features: {
      whatsappAudio: false,
      whatsappImage: false,
      autoReply: false,
      memoryLong: false,
      multiAgent: false,
    },
  },
  pro: {
    whatsappMessagesPerMonth: 5000,
    draftsPerMonth: 5000,
    aiRunsPerMonth: 3000,
    features: {
      whatsappAudio: true,
      whatsappImage: true,
      autoReply: true,
      memoryLong: true,
      multiAgent: true,
    },
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === "pro") return limits.pro;
  if (plan === "basic" || plan === "starter") return limits.basic;
  return limits.free;
}
