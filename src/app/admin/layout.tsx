import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { AuthBrandHeader } from "@/components/auth-brand-header";
import { requireAdmin } from "@/app/admin/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-screen-2xl gap-6 p-4 lg:grid-cols-[280px_1fr] lg:gap-8 lg:p-8">
        <aside className="rounded-3xl border border-border/50 bg-card/20 backdrop-blur">
          <div className="border-b border-border/50 p-5">
            <Link href="/admin" className="block">
              <AuthBrandHeader className="justify-start" iconSize={34} />
            </Link>
            <div className="mt-3 text-xs font-medium text-muted-foreground">Admin</div>
          </div>
          <div className="p-3">
            <AdminNav />
          </div>
          <div className="border-t border-border/50 p-4 text-xs text-muted-foreground">
            <div className="truncate">{auth.user.email ?? "—"}</div>
            <div className="mt-1 truncate">{auth.organization.name}</div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="rounded-3xl border border-border/50 bg-card/20 backdrop-blur">
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <div className="text-sm font-medium text-muted-foreground">Painel administrativo</div>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                Voltar ao app
              </Link>
            </div>
            <div className="p-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
