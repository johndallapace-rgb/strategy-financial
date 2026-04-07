"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboardIcon, ArrowLeftRightIcon, TagsIcon, SettingsIcon, InboxIcon } from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/inbox", label: "Lançamentos Inteligentes", icon: InboxIcon },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRightIcon },
  { href: "/categories", label: "Categorias", icon: TagsIcon },
  { href: "/settings", label: "Configurações", icon: SettingsIcon },
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
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              active && "bg-accent text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
