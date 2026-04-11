"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = { plan: string; canConnect: boolean; connected: boolean; phone?: string | null; profilePhone?: string | null };

async function readStatus(): Promise<Status> {
  const res = await fetch("/api/integrations/whatsapp/status", { cache: "no-store" });
  if (!res.ok) throw new Error("status_error");
  const json = (await res.json()) as { plan?: unknown; canConnect?: unknown; connected?: unknown; phone?: unknown; profilePhone?: unknown };
  return {
    plan: typeof json.plan === "string" ? json.plan : "free",
    canConnect: Boolean(json.canConnect),
    connected: Boolean(json.connected),
    phone: typeof json.phone === "string" ? json.phone : null,
    profilePhone: typeof json.profilePhone === "string" ? json.profilePhone : null,
  };
}

async function post(path: string) {
  const res = await fetch(path, { method: "POST" });
  if (res.status === 403) throw new Error("Seu plano atual não permite conectar WhatsApp.");
  if (!res.ok) throw new Error("Não foi possível concluir a conexão agora.");
  return res.json().catch(() => null);
}

async function postCompleteSignup(input: { phoneNumberId: string; businessAccountId: string }) {
  const res = await fetch("/api/integrations/whatsapp/complete-signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 403) throw new Error("Seu plano atual não permite conectar WhatsApp.");
  if (res.status === 503) throw new Error("A ativação do WhatsApp ainda está sendo finalizada no sistema. Tente novamente em instantes.");
  if (res.status === 401) throw new Error("Não foi possível concluir a ativação agora. Tente novamente.");
  if (!res.ok) throw new Error("Não foi possível concluir a ativação agora. Tente novamente.");
  return res.json().catch(() => null);
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const p1 = digits.slice(4, 9);
    const p2 = digits.slice(9, 13);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }
  return phone;
}

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (cb: (res: unknown) => void, opts: Record<string, unknown>) => void;
    };
  }
}

function loadFacebookSdk({ appId, version }: { appId: string; version: string }) {
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  if (window.FB) return Promise.resolve();
  if (document.getElementById("facebook-jssdk")) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.id = "facebook-jssdk";
    s.async = true;
    s.defer = true;
    s.src = "https://connect.facebook.net/pt_BR/sdk.js";
    s.onload = () => {
      if (!window.FB) return reject(new Error("fb_missing"));
      window.FB.init({ appId, cookie: true, xfbml: false, version });
      resolve();
    };
    s.onerror = () => reject(new Error("sdk_load_failed"));
    document.head.appendChild(s);
  });
}

function parseMetaMessage(data: unknown): unknown {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

export function WhatsappIntegrationCard() {
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>({ plan: "free", canConnect: false, connected: false, phone: null, profilePhone: null });
  const [loading, setLoading] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [popupHelp, setPopupHelp] = React.useState<string | null>(null);
  const [retryableError, setRetryableError] = React.useState<string | null>(null);
  const handledRef = React.useRef(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const s = await readStatus();
      setStatus(s);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh().catch(() => {
      setLoading(false);
    });
  }, [refresh]);

  const embeddedSignup = React.useCallback(async () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || "";
    const configId = process.env.NEXT_PUBLIC_META_WA_EMBEDDED_CONFIG_ID || "";
    const version = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v21.0";

    if (!appId || !configId) {
      throw new Error("A ativação do WhatsApp ainda está sendo finalizada no sistema. Tente novamente em instantes.");
    }

    await loadFacebookSdk({ appId, version });

    const fb = window.FB;
    if (!fb) throw new Error("A ativação do WhatsApp ainda está sendo finalizada no sistema. Tente novamente em instantes.");

    setPopupHelp(null);
    setRetryableError(null);
    handledRef.current = false;

    return new Promise<void>((resolve, reject) => {
      const allowedOrigins = new Set(["https://www.facebook.com", "https://web.facebook.com"]);
      let finished = false;
      let hintTimer: number | null = null;

      const onMessage = (evt: MessageEvent) => {
        if (!allowedOrigins.has(evt.origin)) return;
        const payload = parseMetaMessage(evt.data);
        if (!payload || typeof payload !== "object") return;
        const obj = payload as Record<string, unknown>;
        if (obj.type !== "WA_EMBEDDED_SIGNUP") return;
        const event = obj.event;

        if (hintTimer) {
          window.clearTimeout(hintTimer);
          hintTimer = null;
        }

        if (handledRef.current) return;

        if (event === "CANCEL") {
          cleanup();
          handledRef.current = true;
          finished = true;
          reject(new Error("Não foi possível concluir a ativação agora. Tente novamente."));
          return;
        }
        if (event === "ERROR") {
          cleanup();
          handledRef.current = true;
          finished = true;
          reject(new Error("Não foi possível concluir a ativação agora. Tente novamente."));
          return;
        }
        if (event === "FINISH") {
          handledRef.current = true;
          const data = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : null;
          const phoneNumberId = typeof data?.phone_number_id === "string" ? data.phone_number_id : null;
          const businessAccountId = typeof data?.waba_id === "string" ? data.waba_id : null;
          if (!phoneNumberId || !businessAccountId) {
            cleanup();
            finished = true;
            reject(new Error("Não foi possível concluir a ativação agora. Tente novamente."));
            return;
          }

          startTransition(async () => {
            try {
              await postCompleteSignup({ phoneNumberId, businessAccountId });
              toast.success("WhatsApp Inteligente ativado com sucesso.");
              await refresh();
              cleanup();
              finished = true;
              resolve();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Não foi possível concluir a ativação agora. Tente novamente.");
              cleanup();
              finished = true;
              reject(err instanceof Error ? err : new Error("complete_failed"));
            }
          });
        }
      };

      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        if (hintTimer) {
          window.clearTimeout(hintTimer);
          hintTimer = null;
        }
      };

      window.addEventListener("message", onMessage);

      hintTimer = window.setTimeout(() => {
        if (!finished && !handledRef.current) {
          setPopupHelp("Permita a abertura da janela para continuar.");
        }
      }, 1500);

      fb.login(
        () => {},
        {
          config_id: configId,
          response_type: "code",
          override_default_response_type: true,
          scope: "business_management,whatsapp_business_management,whatsapp_business_messaging",
        }
      );
    });
  }, [refresh, startTransition]);

  const connect = () => {
    if (!status.canConnect) {
      router.push("/billing");
      return;
    }
    startTransition(async () => {
      try {
        toast.success("Abrindo conexão com seu WhatsApp...");
        await embeddedSignup();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Não foi possível abrir a ativação agora.";
        setRetryableError("Tente novamente para continuar.");
        toast.error(msg);
      }
    });
  };

  const reconnect = () => {
    startTransition(async () => {
      try {
        toast.success("Abrindo conexão com seu WhatsApp...");
        await embeddedSignup();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Não foi possível abrir a ativação agora.";
        setRetryableError("Tente novamente para continuar.");
        toast.error(msg);
      }
    });
  };

  const disconnect = () => {
    startTransition(async () => {
      try {
        await post("/api/integrations/whatsapp/disconnect");
        toast.success("WhatsApp desconectado com sucesso");
        await refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível concluir a conexão agora.");
      }
    });
  };

  const disabled = pending || loading;

  return (
    <Card className="bg-card/70 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">WhatsApp Inteligente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.canConnect && !loading ? (
          <>
            <div className="text-sm font-medium text-foreground">Automatize seus lançamentos financeiros diretamente pelo WhatsApp.</div>
            <div className="text-sm text-muted-foreground">
              Envie mensagens como:
              <br />
              <span className="mt-1 inline-block font-mono text-xs">MERCADO 300</span>
              <br />
              <span className="inline-block font-mono text-xs">UBER 45</span>
              <br />
              <span className="inline-block font-mono text-xs">SALÁRIO 2500</span>
              <br />e deixe o sistema interpretar e registrar automaticamente para você.
            </div>
            <div className="text-sm text-muted-foreground">Ganhe tempo e elimine lançamentos manuais no seu dia a dia.</div>
            <div className="space-y-2 rounded-xl border border-border/50 bg-background/10 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><span>✔</span> Lançamentos automáticos por mensagem</div>
              <div className="flex items-center gap-2"><span>✔</span> Interpretação inteligente com IA</div>
              <div className="flex items-center gap-2"><span>✔</span> Mais agilidade no controle financeiro</div>
              <div className="flex items-center gap-2"><span>✔</span> Menos digitação manual</div>
            </div>
            <div className="text-sm font-medium text-rose-400">Desbloqueie este recurso no plano completo.</div>
            <div className="flex flex-col items-start gap-1">
              <Button onClick={connect} disabled={disabled} className="h-10 rounded-2xl">
                {pending ? "Redirecionando para upgrade..." : "Desbloquear WhatsApp Inteligente"}
              </Button>
              <div className="text-xs text-muted-foreground">Esse recurso não está disponível no seu plano atual.</div>
            </div>
          </>
        ) : !status.connected ? (
          <>
            <div className="text-sm font-medium text-foreground">Automatize seus lançamentos financeiros diretamente pelo WhatsApp.</div>
            <div className="text-sm text-muted-foreground">
              Conecte seu WhatsApp para começar a automatizar seus lançamentos com inteligência.
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Exemplos de mensagens:</div>
              <div className="rounded-xl border border-border/50 bg-background/10 px-4 py-3 font-mono text-xs text-foreground">
                MERCADO 300
                <br />
                UBER 45
                <br />
                SALÁRIO 2500
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Leva poucos minutos e você poderá usar seu próprio número.</div>
            {status.profilePhone ? (
              <div className="text-sm text-muted-foreground">Número cadastrado no seu perfil: {formatPhone(status.profilePhone)}</div>
            ) : (
              <div className="text-sm text-muted-foreground">Você poderá confirmar seu número durante a ativação.</div>
            )}
            {popupHelp ? <div className="text-sm text-muted-foreground">{popupHelp}</div> : null}
            {retryableError ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/10 px-4 py-3 text-sm text-muted-foreground">
                <div>{retryableError}</div>
                <Button variant="outline" onClick={connect} disabled={disabled} className="h-9 rounded-xl">
                  Tentar novamente
                </Button>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button onClick={connect} disabled={disabled} className="h-10 rounded-2xl">
                {pending ? "Conectando WhatsApp..." : "Ativar WhatsApp Inteligente"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium text-foreground">Ativo ✅</div>
            <div className="text-sm text-muted-foreground">{status.phone ? formatPhone(status.phone) : "Número conectado"}</div>
            <div className="text-sm text-muted-foreground">Suas mensagens já estão sendo interpretadas automaticamente pelo sistema.</div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={reconnect} disabled={disabled} className="h-10 rounded-2xl">
                {pending ? "Conectando WhatsApp..." : "Reconectar WhatsApp"}
              </Button>
              <Button variant="outline" onClick={disconnect} disabled={disabled} className="h-10 rounded-2xl">
                Desconectar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
