import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "StrateggyApp",
  description: "Controle financeiro com dashboard e alertas inteligentes.",
};

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">StrateggyApp</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Controle financeiro com dashboard, alertas e automação por WhatsApp.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="https://app.strateggyapp.com/login"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Entrar
        </Link>
        <Link
          href="/privacy"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-border/60 bg-background/10 px-4 text-sm font-medium text-foreground hover:bg-background/20"
        >
          Política de Privacidade
        </Link>
      </div>
    </div>
  );
}
