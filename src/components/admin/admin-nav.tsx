"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboardIcon,
  PlugIcon,
  BarChart3Icon,
  CreditCardIcon,
  UsersIcon,
  SparklesIcon,
  ScrollTextIcon,
} from "lucide-react";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/integrations", label: "Integrações", icon: PlugIcon },
  { href: "/admin/usage", label: "Uso", icon: BarChart3Icon },
  { href: "/admin/billing", label: "Billing", icon: CreditCardIcon },
  { href: "/admin/users", label: "Usuários", icon: UsersIcon },
  { href: "/admin/ai", label: "IA / OpenAI", icon: SparklesIcon },
  { href: "/admin/logs", label: "Logs", icon: ScrollTextIcon },
] as const;

export function AdminNav() {
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
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
              active && "bg-muted/50 text-foreground"
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
