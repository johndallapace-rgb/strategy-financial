import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInviteAction } from "@/app/actions/team";
import { AuthBrandHeader } from "@/components/auth-brand-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthContext, getSessionTokenHashFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function InvitePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const code = typeof sp.code === "string" ? sp.code : undefined;

  if (!code) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_circle_at_18%_12%,rgba(37,99,235,0.20),transparent_55%),radial-gradient(900px_circle_at_82%_10%,rgba(139,92,246,0.18),transparent_52%),radial-gradient(1100px_circle_at_50%_100%,rgba(16,185,129,0.10),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05071a] via-[#06081c] to-[#020316] opacity-80" />
        <div className="relative mx-auto flex min-h-dvh max-w-screen-sm items-center px-4 py-10">
          <Card className="w-full rounded-2xl border border-white/10 bg-card/55 shadow-[0_18px_50px_rgba(0,0,0,0.50)] backdrop-blur-xl">
            <CardHeader className="space-y-6 pb-2 pt-8">
              <AuthBrandHeader />
              <CardTitle className="text-center text-[22px] font-semibold tracking-tight">{t("invite.invalidTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pb-7 pt-0 text-center">
              <div className="text-sm text-muted-foreground">{t("invite.missingCode")}</div>
              <Link
                href="/"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_40px_rgba(0,0,0,0.35)] transition-colors hover:bg-primary/90"
              >
                {t("invite.goToApp")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const ctx = await getAuthContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(`/invite?code=${code}`)}`);

  const fd = new FormData();
  fd.set("code", code);
  const result = await acceptInviteAction(null, fd);

  if (result?.ok && result.organizationId) {
    const tokenHash = await getSessionTokenHashFromCookies();
    if (tokenHash) {
      await db.session.updateMany({
        where: { tokenHash },
        data: { organizationId: result.organizationId },
      });
    }
    redirect("/");
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_circle_at_18%_12%,rgba(37,99,235,0.20),transparent_55%),radial-gradient(900px_circle_at_82%_10%,rgba(139,92,246,0.18),transparent_52%),radial-gradient(1100px_circle_at_50%_100%,rgba(16,185,129,0.10),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05071a] via-[#06081c] to-[#020316] opacity-80" />
      <div className="relative mx-auto flex min-h-dvh max-w-screen-sm items-center px-4 py-10">
        <Card className="w-full rounded-2xl border border-white/10 bg-card/55 shadow-[0_18px_50px_rgba(0,0,0,0.50)] backdrop-blur-xl">
          <CardHeader className="space-y-6 pb-2 pt-8">
            <AuthBrandHeader />
            <CardTitle className="text-center text-[22px] font-semibold tracking-tight">{t("invite.cannotJoin")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pb-7 pt-0">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {result?.error ?? t("auth.unexpected")}
            </div>
            <Link
              href="/settings"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_14px_40px_rgba(0,0,0,0.35)] transition-colors hover:bg-primary/90"
            >
              {t("invite.goToSettings")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
