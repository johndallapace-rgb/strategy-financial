"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { completeProfileAction } from "@/app/actions/auth";
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
      {pending ? t("common.wait") : t("auth.submitSaving")}
    </Button>
  );
}

export function CompleteProfileForm({
  next,
  email,
  defaultName,
  defaultOrgName,
}: {
  next?: string;
  email: string | null;
  defaultName: string;
  defaultOrgName: string;
}) {
  const [name, setName] = React.useState(defaultName);
  const [orgName, setOrgName] = React.useState(defaultOrgName);
  const [phone, setPhone] = React.useState("");

  return (
    <form action={completeProfileAction} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="grid gap-1.5">
        <Label htmlFor="name">{t("auth.nameLabel")}</Label>
        <Input
          id="name"
          name="name"
          placeholder={t("auth.namePlaceholder")}
          autoComplete="name"
          className="h-11 rounded-xl bg-background/35 backdrop-blur placeholder:text-muted-foreground/70"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="orgName">{t("auth.companyNameLabel")}</Label>
        <Input
          id="orgName"
          name="orgName"
          placeholder={t("auth.companyNamePlaceholder")}
          autoComplete="organization"
          className="h-11 rounded-xl bg-background/35 backdrop-blur placeholder:text-muted-foreground/70"
          required
          value={orgName}
          onChange={(e) => setOrgName(e.currentTarget.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="phone">{t("auth.phoneLabel")}</Label>
        <Input
          id="phone"
          name="phone"
          placeholder={t("auth.phonePlaceholder")}
          autoComplete="tel"
          className="h-11 rounded-xl bg-background/35 backdrop-blur placeholder:text-muted-foreground/70"
          required
          value={phone}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("auth.emailLabel")}</Label>
        <Input
          id="email"
          name="email"
          value={email ?? ""}
          readOnly
          className="h-11 rounded-xl bg-background/20 backdrop-blur placeholder:text-muted-foreground/70"
        />
      </div>

      <SubmitButton />
    </form>
  );
}

