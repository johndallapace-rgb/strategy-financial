"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppNav } from "@/components/app-nav";
import { SessionBadge } from "@/components/session-badge";
import { MenuIcon, PlusIcon } from "lucide-react";
import { t } from "@/lib/i18n";

function titleFor(pathname: string) {
  if (pathname === "/") return t("nav.dashboard");
  if (pathname.startsWith("/transactions")) return t("nav.transactions");
  if (pathname.startsWith("/categories")) return t("nav.categories");
  if (pathname.startsWith("/billing")) return t("nav.billing");
  if (pathname.startsWith("/settings")) return t("nav.settings");
  return "STRATEGY FINANCIAL";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const title = titleFor(pathname);

  return (
    <div className="relative min-h-dvh bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(59,130,246,0.12),transparent_55%),radial-gradient(800px_circle_at_80%_0%,rgba(168,85,247,0.10),transparent_50%),radial-gradient(900px_circle_at_50%_100%,rgba(34,197,94,0.08),transparent_55%)]" />
      <div className="mx-auto flex min-h-dvh w-full max-w-screen-2xl">
        <aside className="relative hidden w-[288px] shrink-0 border-r bg-sidebar/80 text-sidebar-foreground backdrop-blur md:flex md:flex-col">
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_14px_rgba(0,0,0,0.25)] transition-all duration-200 group-hover:scale-[1.03]">
                <Image
                  src="/brand/icon-clean-64.png"
                  alt="Strategy Financial"
                  width={36}
                  height={36}
                  className="rounded-lg opacity-95 transition-opacity duration-200 group-hover:opacity-100"
                  priority
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-sm font-semibold leading-none tracking-tight text-foreground/90">STRATEGY</span>
                <span className="mt-[3px] text-[10px] font-medium leading-none tracking-[0.2em] text-muted-foreground/70">FINANCIAL</span>
              </div>
            </Link>
          </div>
          <div className="px-3 pb-4">
            <AppNav />
          </div>
          <div className="mt-auto px-3 pb-4">
            <div className="rounded-2xl border bg-card/60 p-3 text-xs text-muted-foreground backdrop-blur">
              Inteligência financeira, alertas e automações — pronta para evoluir.
            </div>
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/40">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger render={<Button variant="outline" size="icon" className="md:hidden" aria-label="Menu" />}>
                <MenuIcon className="size-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] p-0">
                <SheetHeader className="border-b px-4 py-4">
                  <SheetTitle className="group flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_4px_14px_rgba(0,0,0,0.25)] transition-all duration-200 group-hover:scale-[1.03]">
                      <Image
                        src="/brand/icon-clean-64.png"
                        alt="Strategy Financial"
                        width={36}
                        height={36}
                        className="rounded-lg opacity-95 transition-opacity duration-200 group-hover:opacity-100"
                        priority
                      />
                    </div>
                    <div className="flex flex-col justify-center text-left">
                      <span className="text-sm font-semibold leading-none tracking-tight text-foreground/90">STRATEGY</span>
                      <span className="mt-[3px] text-[10px] font-medium leading-none tracking-[0.2em] text-muted-foreground/70">FINANCIAL</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 py-4">
                  <AppNav onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold md:text-base">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <SessionBadge />
              <Link className={buttonVariants({ variant: "default" })} href="/transactions/new">
                <span className="flex items-center gap-2">
                  <PlusIcon className="size-4" />
                  <span className="hidden sm:inline">Nova transação</span>
                </span>
              </Link>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6">{children}</main>

          <Link
            href="/transactions/new"
            className="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/10 md:hidden"
            aria-label="Nova transação"
          >
            <PlusIcon className="size-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
