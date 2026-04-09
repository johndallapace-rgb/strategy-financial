"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { signInAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.3 35.7 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1 2.6-2.9 4.7-5.3 6.1l.1-.1 6.2 5.2C35.9 39.6 44 34 44 24c0-1.1-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all hover:bg-primary/95 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)] active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
      disabled={pending}
    >
      {pending ? t("auth.signingIn") : t("auth.signIn")}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");

  return (
    <form action={signInAction} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl border-white/10 bg-background/30 shadow-sm backdrop-blur transition-colors hover:bg-background/40"
        onClick={() => {
          window.location.href = next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google";
        }}
      >
        <GoogleMark className="mr-2 size-5" />
        {t("auth.continueWithGoogle")}
      </Button>

      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-border/60" />
        <div className="text-xs text-muted-foreground">{t("common.or")}</div>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="identifier">{t("auth.emailOrPhone")}</Label>
        <Input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder={t("auth.emailOrPhonePlaceholder")}
          className="h-11 rounded-xl bg-background/35 backdrop-blur placeholder:text-muted-foreground/70"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.currentTarget.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-11 rounded-xl bg-background/35 backdrop-blur placeholder:text-muted-foreground/70"
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
