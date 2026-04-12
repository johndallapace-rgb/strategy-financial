import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/auth";
import { getMonthPeriod } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function canConnectOwnWhatsapp(plan: string) {
  return plan === "pro" || plan === "enterprise";
}

function isBasic(plan: string) {
  return plan === "basic";
}

function isFreeLike(plan: string) {
  return plan === "free" || plan === "starter";
}

function countryFromPhone(phone: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("1")) return "US";
  if (digits.startsWith("34")) return "ES";
  if (digits.startsWith("55")) return "BR";
  return "BR";
}

function getCentralPublicNumber(country: string) {
  const map: Record<string, string | undefined> = {
    BR: process.env.WHATSAPP_CENTRAL_PUBLIC_NUMBER_BR,
    US: process.env.WHATSAPP_CENTRAL_PUBLIC_NUMBER_US,
    ES: process.env.WHATSAPP_CENTRAL_PUBLIC_NUMBER_ES,
    DE: process.env.WHATSAPP_CENTRAL_PUBLIC_NUMBER_DE,
  };
  return map[country] ?? null;
}

export async function GET() {
  const auth = await requireAuthContext();

  const [sub, conn] = await Promise.all([
    db.subscription.findUnique({
      where: { organizationId: auth.organization.id },
      select: { plan: true },
    }),
    db.integrationConnection.findUnique({
      where: { organizationId_type: { organizationId: auth.organization.id, type: "whatsapp" } },
      select: { status: true, whatsappPhoneNumberId: true },
    }),
  ]);

  const plan = sub?.plan ?? "free";
  const canConnect = canConnectOwnWhatsapp(plan);
  const connected = conn?.status === "active" && Boolean(conn.whatsappPhoneNumberId);
  const isBasicPlan = isBasic(plan);
  const isFreePlan = isFreeLike(plan);

  const centralCountry = countryFromPhone(auth.user.phone ?? null);
  const centralPublicNumber = getCentralPublicNumber(centralCountry);
  const basicMonthlyLimit = Number.parseInt(process.env.WHATSAPP_BASIC_MONTHLY_LIMIT || "20", 10);
  const period = getMonthPeriod(new Date());
  const metricKey = `whatsapp_central_${centralCountry}_units_user_${auth.user.id}`;

  const usedMetric = isBasicPlan
    ? await db.usageMetric.findUnique({
        where: {
          organizationId_metricKey_periodStart_periodEnd: {
            organizationId: auth.organization.id,
            metricKey,
            periodStart: period.start,
            periodEnd: period.end,
          },
        },
        select: { metricValue: true },
      })
    : null;
  const basicMonthlyUsed = usedMetric?.metricValue ?? 0;

  return NextResponse.json({
    plan,
    canConnect,
    connected,
    phone: null,
    profilePhone: auth.user.phone ?? null,
    mode: isFreePlan ? "free" : isBasicPlan ? "basic" : canConnect ? "pro" : "free",
    centralCountry,
    centralPublicNumber,
    basicMonthlyLimit: isBasicPlan ? basicMonthlyLimit : null,
    basicMonthlyUsed: isBasicPlan ? basicMonthlyUsed : null,
  });
}
