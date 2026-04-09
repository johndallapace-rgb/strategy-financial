"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon, Building2Icon, ChevronDownIcon } from "lucide-react";
import { t } from "@/lib/i18n";

type SessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | {
      status: "authenticated";
      organization: { id: string; name: string };
      user: { email: string | null; phone: string | null };
      organizations: Array<{ id: string; name: string; role: "owner" | "admin" | "member" }>;
    };

export function SessionBadge() {
  const [state, setState] = React.useState<SessionState>({ status: "loading" });
  const [switching, startSwitch] = React.useTransition();

  React.useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then(async (r) => {
        if (!active) return;
        if (!r.ok) {
          setState({ status: "unauthenticated" });
          return;
        }
        const data = (await r.json()) as {
          organization: { id: string; name: string };
          user: { email: string | null; phone: string | null };
          organizations?: Array<{ id: string; name: string; role: "owner" | "admin" | "member" }>;
        };
        setState({
          status: "authenticated",
          organization: data.organization,
          user: data.user,
          organizations: data.organizations ?? [{ id: data.organization.id, name: data.organization.name, role: "member" }],
        });
      })
      .catch(() => {
        if (!active) return;
        setState({ status: "unauthenticated" });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.status !== "authenticated") return null;

  const canSwitch = state.organizations.length > 1;

  return (
    <div className="flex items-center gap-2">
      {canSwitch ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="hidden h-9 items-center gap-2 rounded-xl border-white/10 bg-background/20 px-3 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:bg-background/30 sm:flex"
                disabled={switching}
              >
                <Building2Icon className="size-4 text-primary" />
                <span className="max-w-[180px] truncate">{state.organization.name}</span>
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-xl">
            <DropdownMenuLabel>{t("org.organizations")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={state.organization.id}
              onValueChange={(nextOrgId) => {
                startSwitch(async () => {
                  const res = await fetch("/api/session/organization", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ organizationId: nextOrgId }),
                  });
                  if (res.ok) window.location.reload();
                });
              }}
            >
              {state.organizations.map((o) => (
                <DropdownMenuRadioItem key={o.id} value={o.id} className="gap-2">
                  <Building2Icon className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  <span className="text-xs tracking-wider text-muted-foreground">
                    {o.role === "owner" ? t("role.ownerShort") : o.role === "admin" ? t("role.adminShort") : t("role.memberShort")}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {switching ? t("org.switching") : t("org.switchHelp")}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Badge variant="secondary" className="hidden items-center gap-1.5 px-3 py-1 text-sm font-medium sm:flex">
          <Building2Icon className="size-4 text-primary" />
          <span className="max-w-[220px] truncate">{state.organization.name}</span>
        </Badge>
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Sair"
        onClick={async () => {
          await fetch("/api/logout", { method: "POST" });
          window.location.href = "/login";
        }}
      >
        <LogOutIcon className="size-4" />
      </Button>
    </div>
  );
}
