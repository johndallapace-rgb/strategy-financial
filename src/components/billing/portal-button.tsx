"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function PortalButton({ className }: { className?: string }) {
  return (
    <Button
      className={className}
      onClick={async () => {
        try {
          const res = await fetch("/api/stripe/portal", {
            method: "POST",
          });

          const data = await res.json();

          if (!data?.url) {
            throw new Error("No portal URL returned");
          }

          window.location.href = data.url;
        } catch (err) {
          console.error("Portal error:", err);
          alert(t("billing.portalError"));
        }
      }}
    >
      {t("billing.manageSubscription")}
    </Button>
  );
}
