import { db } from "@/lib/db";

export function getMonthPeriod(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function incrementUsageMetric({
  organizationId,
  userId,
  metricKey,
  periodStart,
  periodEnd,
  delta,
}: {
  organizationId: string;
  userId: string | null;
  metricKey: string;
  periodStart: Date;
  periodEnd: Date;
  delta: number;
}) {
  await db.usageMetric.upsert({
    where: {
      organizationId_metricKey_periodStart_periodEnd: {
        organizationId,
        metricKey,
        periodStart,
        periodEnd,
      },
    },
    create: {
      organizationId,
      userId,
      metricKey,
      metricValue: delta,
      periodStart,
      periodEnd,
    },
    update: {
      metricValue: { increment: delta },
    },
    select: { id: true },
  });
}
