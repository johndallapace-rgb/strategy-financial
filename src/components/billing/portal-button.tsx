"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

export function PortalButton({
  className,
  onError,
  label,
  variant,
}: {
  className?: string;
  onError?: (code: string) => void;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const [loading, setLoading] = React.useState(false);

  return (
    <Button
      className={className}
      variant={variant}
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fetch("/api/stripe/portal", {
            method: "POST",
          });

          const data = await res.json();

          if (data?.error === "no_customer") {
            setLoading(false);
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
          setLoading(false);
          if (onError) {
            onError("unknown");
            return;
          }
          alert(t("billing.portalError"));
        }
      }}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {label ?? t("billing.manageSubscription")}
    </Button>
  );
}
