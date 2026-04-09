"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { LayoutDashboardIcon, ArrowLeftRightIcon, TagsIcon, SettingsIcon, InboxIcon } from "lucide-react";

const items = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboardIcon },
  { href: "/inbox", labelKey: "nav.smartInbox", icon: InboxIcon },
  { href: "/transactions", labelKey: "nav.transactions", icon: ArrowLeftRightIcon },
  { href: "/categories", labelKey: "nav.categories", icon: TagsIcon },
  { href: "/settings", labelKey: "nav.settings", icon: SettingsIcon },
] as const;

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
              active && "bg-muted/50 text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
