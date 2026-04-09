"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircleIcon,
  CheckIcon,
  XIcon,
  BotIcon,
  ArrowRightIcon,
  ClockIcon,
} from "lucide-react";

// Mock data to simulate the "Inbox" of parsed messages
const drafts = [
  {
    id: "draft-1",
    originalMessage: "Almoço no Madero hoje R$ 85,50 no cartão de crédito",
    receivedAt: "10:30",
    status: "pending",
    parsed: {
      name: "Almoço no Madero",
      amount: 85.5,
      type: "expense",
      category: "Alimentação",
      account: "Conta PF",
      entityType: "PF",
    },
  },
  {
    id: "draft-2",
    originalMessage: "Recebi o pagamento do cliente João, 1500 na conta PJ",
    receivedAt: "09:15",
    status: "pending",
    parsed: {
      name: "Pagamento João",
      amount: 1500.0,
      type: "income",
      category: "Receita Operacional",
      account: "Conta PJ",
      entityType: "PJ",
    },
  },
  {
    id: "draft-3",
    originalMessage: "Uber 25 conto pra ir pro escritório",
    receivedAt: "Ontem",
    status: "pending",
    parsed: {
      name: "Uber Escritório",
      amount: 25.0,
      type: "expense",
      category: "Transporte",
      account: "Conta PF",
      entityType: "PF",
    },
  },
];

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lançamentos Inteligentes</h1>
          <p className="text-muted-foreground mt-1">
            Revise os lançamentos pré-preenchidos via WhatsApp ou texto natural.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium">
            <BotIcon className="size-4 text-primary" />
            <span>IA Ativada</span>
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {drafts.map((draft) => (
          <Card key={draft.id} className="flex flex-col border-muted/60 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircleIcon className="size-4 text-emerald-500" />
                  <span>Mensagem Original</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="size-3" />
                  {draft.receivedAt}
                </div>
              </div>
              <CardDescription className="text-sm font-medium text-foreground mt-2 italic bg-muted/30 p-3 rounded-md border border-muted/50">
                &ldquo;{draft.originalMessage}&rdquo;
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Interpretação
                  </span>
                  <Badge
                    variant={draft.parsed.type === "income" ? "default" : "destructive"}
                    className={
                      draft.parsed.type === "income"
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                    }
                  >
                    {draft.parsed.type === "income" ? "Receita" : "Despesa"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-muted-foreground">Valor:</div>
                  <div className="font-medium text-right font-mono">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(draft.parsed.amount)}
                  </div>
                  
                  <div className="text-muted-foreground">Descrição:</div>
                  <div className="font-medium text-right truncate" title={draft.parsed.name}>
                    {draft.parsed.name}
                  </div>

                  <div className="text-muted-foreground">Categoria:</div>
                  <div className="font-medium text-right">{draft.parsed.category}</div>

                  <div className="text-muted-foreground">Conta:</div>
                  <div className="font-medium text-right">{draft.parsed.account}</div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t border-muted/40 gap-2">
              <Button variant="outline" className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                <XIcon className="mr-2 size-4" />
                Descartar
              </Button>
              <Button className="w-full bg-primary hover:bg-primary/90">
                <CheckIcon className="mr-2 size-4" />
                Revisar
              </Button>
            </CardFooter>
          </Card>
        ))}
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
