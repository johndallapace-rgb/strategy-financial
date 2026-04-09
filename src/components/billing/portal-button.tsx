"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function PortalButton({ className, onError }: { className?: string; onError?: (code: string) => void }) {
  return (
    <Button
      className={className}
      onClick={async () => {
        try {
          const res = await fetch("/api/stripe/portal", {
            method: "POST",
          });

          const data = await res.json();

          if (data?.error === "no_customer") {
            if (onError) {
              onError("no_customer");
              return;
            }
            alert(t("billing.noActiveSubscription"));
            return;
          }

          if (!data?.url) {
            throw new Error("No portal URL returned");
          }

          window.location.href = data.url;
        } catch (err) {
          console.error("Portal error:", err);
          if (onError) {
            onError("unknown");
            return;
          }
          alert(t("billing.portalError"));
        }
      }}
    >
      {t("billing.manageSubscription")}
    </Button>
  );
}
