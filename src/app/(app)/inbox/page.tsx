"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { discardSmartDraftAction, setInboxApprovalModeAction } from "@/app/(app)/inbox/actions";
import {
  MessageCircleIcon,
  CheckIcon,
  XIcon,
  BotIcon,
  ArrowRightIcon,
  ClockIcon,
} from "lucide-react";

type ApiDraft = {
  id: string;
  receivedAt: string;
  originalMessage: string | null;
  parsed: unknown | null;
};

function formatTimeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR");
}

function normalizeParsed(parsed: unknown) {
  const p = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  return {
    type: p?.type === "income" || p?.type === "expense" ? (p.type as "income" | "expense") : null,
    amount: typeof p?.amount === "number" ? (p.amount as number) : null,
    name: typeof p?.name === "string" ? p.name : null,
    category: typeof p?.category === "string" ? p.category : null,
    account: typeof p?.account === "string" ? p.account : null,
  };
}

export default function InboxPage() {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<ApiDraft[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [manualReviewRequired, setManualReviewRequired] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/inbox/drafts");
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        setDrafts(Array.isArray(data?.drafts) ? (data.drafts as ApiDraft[]) : []);
        setManualReviewRequired(typeof data?.manualReviewRequired === "boolean" ? data.manualReviewRequired : true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const discardDraft = (draftId: string) => {
    startTransition(async () => {
      setPendingId(draftId);
      try {
        if (process.env.NODE_ENV !== "production") console.debug("[inbox] discard", { draftId });
        await discardSmartDraftAction({ draftId });
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      } finally {
        setPendingId(null);
      }
    });
  };

  const reviewDraft = (draftId: string) => {
    if (process.env.NODE_ENV !== "production") console.debug("[inbox] review", { draftId });
    router.push(`/transactions/new?draftId=${encodeURIComponent(draftId)}`);
  };

  const setApprovalMode = (nextManual: boolean) => {
    startTransition(async () => {
      try {
        if (process.env.NODE_ENV !== "production") console.debug("[inbox] approval_mode", { manualReviewRequired: nextManual });
        setManualReviewRequired(nextManual);
        await setInboxApprovalModeAction({ manualReviewRequired: nextManual });
      } catch {
        setManualReviewRequired((v) => !v);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lançamentos Inteligentes</h1>
          <p className="text-muted-foreground mt-1">
            Revise os lançamentos pré-preenchidos via WhatsApp ou texto natural.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium">
            <BotIcon className="size-4 text-primary" />
            <span>IA Ativada</span>
          </Badge>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">Aprovação manual</div>
              <div className="text-xs text-muted-foreground">
                {manualReviewRequired ? "Exigir revisão antes de lançar" : "Inserir automaticamente quando possível"}
              </div>
            </div>
            <Switch checked={manualReviewRequired} onCheckedChange={setApprovalMode} disabled={pending} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="flex flex-col border-muted/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="text-sm text-muted-foreground">Carregando…</div>
            </CardHeader>
          </Card>
        ) : null}
        {!loading && drafts.length === 0 ? (
          <Card className="flex flex-col border-muted/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="text-sm text-muted-foreground">Nenhum rascunho pendente no momento.</div>
            </CardHeader>
          </Card>
        ) : null}
        {drafts.map((draft) => {
          const parsed = normalizeParsed(draft.parsed);
          return (
          <Card key={draft.id} className="flex flex-col border-muted/60 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircleIcon className="size-4 text-emerald-500" />
                  <span>Mensagem Original</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="size-3" />
                  {formatTimeLabel(draft.receivedAt)}
                </div>
              </div>
              <CardDescription className="text-sm font-medium text-foreground mt-2 italic bg-muted/30 p-3 rounded-md border border-muted/50">
                &ldquo;{draft.originalMessage ?? "—"}&rdquo;
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Interpretação
                  </span>
                  <Badge
                    variant={parsed.type === "income" ? "default" : parsed.type === "expense" ? "destructive" : "secondary"}
                    className={
                      parsed.type === "income"
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                        : parsed.type === "expense"
                          ? "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                          : ""
                    }
                  >
                    {parsed.type === "income" ? "Receita" : parsed.type === "expense" ? "Despesa" : "Rascunho"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-muted-foreground">Valor:</div>
                  <div className="font-medium text-right font-mono">
                    {parsed.amount == null
                      ? "—"
                      : new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(parsed.amount)}
                  </div>
                  
                  <div className="text-muted-foreground">Descrição:</div>
                  <div className="font-medium text-right truncate" title={parsed.name ?? ""}>
                    {parsed.name ?? "—"}
                  </div>

                  <div className="text-muted-foreground">Categoria:</div>
                  <div className="font-medium text-right">{parsed.category ?? "—"}</div>

                  <div className="text-muted-foreground">Conta:</div>
                  <div className="font-medium text-right">{parsed.account ?? "—"}</div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row pt-4 border-t border-muted/40 gap-2">
              <Button
                className="w-full sm:flex-1 bg-primary hover:bg-primary/90"
                onClick={() => reviewDraft(draft.id)}
                disabled={pending && pendingId === draft.id}
              >
                <CheckIcon className="mr-2 size-4" />
                Aprovar
              </Button>
              <Button
                variant="outline"
                className="w-full sm:flex-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                onClick={() => discardDraft(draft.id)}
                disabled={pending && pendingId === draft.id}
              >
                <XIcon className="mr-2 size-4" />
                Descartar
              </Button>
            </CardFooter>
          </Card>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/10 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <BotIcon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Como funciona a Integração WhatsApp?</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl mx-auto">
          No futuro, você poderá encaminhar áudios e textos diretamente para o número do assistente no WhatsApp.
          A inteligência artificial vai extrair valor, categoria e conta, deixando o lançamento em “Rascunho” aqui
          neste painel para você apenas revisar e aprovar com 1 clique.
        </p>
        <div className="mt-6 flex justify-center">
          <Button variant="outline" className="gap-2" disabled>
            Configurar Número (Em Breve)
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
