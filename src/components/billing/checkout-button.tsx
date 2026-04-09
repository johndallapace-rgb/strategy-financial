"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function CheckoutButton({ className }: { className?: string }) {
  return (
    <Button
      className={className}
      onClick={async () => {
        try {
          const res = await fetch("/api/stripe/checkout", {
            method: "POST",
          });

          const data = await res.json();

          if (!data?.url) {
            throw new Error("No checkout URL returned");
          }

          window.location.href = data.url;
        } catch (err) {
          console.error("Checkout error:", err);
          alert(t("billing.checkoutError"));
        }
      }}
    >
      {t("billing.subscribePlan")}
    </Button>
  );
}
