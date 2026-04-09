"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { signUpAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all hover:bg-primary/95 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)] active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
      disabled={pending}
    >
      {pending ? t("auth.signingUp") : t("auth.createAndSignIn")}
    </Button>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const [orgName, setOrgName] = React.useState("");
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  const passwordRule = t("auth.passwordRule");
  const isPasswordValid = React.useCallback((value: string) => {
    return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
  }, []);

  return (
    <form
      action={signUpAction}
      className="grid gap-4"
      onSubmit={(e) => {
        if (!isPasswordValid(password)) {
          e.preventDefault();
          setPasswordError(passwordRule);
        }
      }}
    >
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="grid gap-1.5">
        <Label htmlFor="orgName">{t("auth.companyNameLabel")}</Label>
        <Input
          id="orgName"
          name="orgName"
          placeholder={t("auth.companyNamePlaceholder")}
          autoComplete="organization"
          className="h-11 rounded-xl bg-background/35 backdrop-blur"
          required
          value={orgName}
          onChange={(e) => setOrgName(e.currentTarget.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="identifier">{t("auth.emailOrPhone")}</Label>
        <Input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder={t("auth.emailOrPhonePlaceholder")}
          className="h-11 rounded-xl bg-background/35 backdrop-blur"
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
          autoComplete="new-password"
          className="h-11 rounded-xl bg-background/35 backdrop-blur"
          required
          value={password}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setPassword(v);
            if (v.length === 0) {
              setPasswordError(null);
              return;
            }
            setPasswordError(isPasswordValid(v) ? null : passwordRule);
          }}
        />
        {passwordError ? (
          <div className="text-xs text-destructive">{passwordError}</div>
        ) : (
          <div className="text-xs text-muted-foreground">{passwordRule}</div>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
