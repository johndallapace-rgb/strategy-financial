"use client";

import * as React from "react";
import { PortalButton } from "@/components/billing/portal-button";
import { t } from "@/lib/i18n";

export function ManageSubscriptionCta({ className }: { className?: string }) {
  const [msg, setMsg] = React.useState<string | null>(null);

  return (
    <div className="space-y-2">
      {msg ? <div className="rounded-xl border bg-card/30 px-3 py-2 text-sm text-muted-foreground">{msg}</div> : null}
      <PortalButton
        className={className}
        onError={(code) => {
          setMsg(code === "no_customer" ? t("billing.noActiveSubscription") : t("billing.portalError"));
        }}
      />
    </div>
  );
}

