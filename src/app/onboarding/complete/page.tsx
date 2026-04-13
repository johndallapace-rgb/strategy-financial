import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandHeader } from "@/components/auth-brand-header";
import { CompleteProfileForm } from "@/app/onboarding/complete/complete-form";
import { t } from "@/lib/i18n";

function isPlaceholderOrgName(name: string) {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return n === "espaco de trabalho";
}

function messageFor(code: string | undefined) {
  if (code === "invalid_name") return t("auth.invalidName");
  if (code === "invalid_phone") return t("auth.invalidPhone");
  if (code === "invalid_org") return t("auth.invalidOrgName");
  if (code === "phone_in_use") return t("auth.phoneInUse");
  return null;
}

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireAuthContext();
  if (auth.user.phone && auth.user.name && !isPlaceholderOrgName(auth.organization.name)) redirect("/");

  const sp = (await searchParams) ?? {};
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const msg = messageFor(error);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_circle_at_18%_12%,rgba(37,99,235,0.20),transparent_55%),radial-gradient(900px_circle_at_82%_10%,rgba(139,92,246,0.18),transparent_52%),radial-gradient(1100px_circle_at_50%_100%,rgba(16,185,129,0.10),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05071a] via-[#06081c] to-[#020316] opacity-80" />

      <div className="relative mx-auto flex min-h-dvh max-w-screen-sm items-center px-4 py-10">
        <div className="relative w-full">
          <div className="pointer-events-none absolute -inset-6 rounded-[32px] bg-[radial-gradient(closest-side,rgba(59,130,246,0.09),transparent_70%)] blur-2xl" />

          <Card className="relative w-full rounded-2xl border border-white/10 bg-card/45 shadow-[0_14px_44px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <CardHeader className="space-y-6 pb-2 pt-8">
              <AuthBrandHeader />
              <CardTitle className="text-center text-[22px] font-semibold tracking-tight">{t("auth.completeProfileTitle")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 pb-7 pt-0">
              {msg ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{msg}</div>
              ) : null}
              <CompleteProfileForm
                next={next}
                email={auth.user.email}
                defaultName={auth.user.name ?? ""}
                defaultOrgName={auth.organization.name ?? t("org.defaultName")}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
