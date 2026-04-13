"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Credential = {
  id: string;
  name: string;
  status: "active" | "disabled";
  scopes: string[];
  createdAt: string;
};

async function readCredentials(): Promise<{ ok: true; credentials: Credential[] } | { ok: false; status: number }> {
  const res = await fetch("/api/settings/enterprise/credentials", { cache: "no-store" });
  if (!res.ok) return { ok: false, status: res.status };
  const json = (await res.json().catch(() => null)) as { ok?: unknown; credentials?: unknown } | null;
  const credsRaw = json && typeof json === "object" && Array.isArray(json.credentials) ? (json.credentials as unknown[]) : [];
  const credentials = credsRaw
    .map((c) => {
      const obj = c && typeof c === "object" ? (c as Record<string, unknown>) : null;
      const id = typeof obj?.id === "string" ? obj.id : "";
      const name = typeof obj?.name === "string" ? obj.name : "";
      const status = obj?.status === "active" || obj?.status === "disabled" ? obj.status : "disabled";
      const scopes = Array.isArray(obj?.scopes) ? (obj?.scopes as unknown[]).filter((s) => typeof s === "string") : [];
      const createdAt = typeof obj?.createdAt === "string" ? obj.createdAt : "";
      if (!id || !name) return null;
      return { id, name, status, scopes: scopes as string[], createdAt };
    })
    .filter(Boolean) as Credential[];
  return { ok: true, credentials };
}

async function createCredential(input: { name: string; scopes: string[] }) {
  const res = await fetch("/api/settings/enterprise/credentials", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 403) throw new Error("Sem permissão.");
  if (!res.ok) throw new Error("Não foi possível gerar a credencial agora.");
  const json = (await res.json().catch(() => null)) as { ok?: unknown; apiKey?: unknown; credential?: unknown } | null;
  const apiKey = typeof json?.apiKey === "string" ? json.apiKey : null;
  if (!apiKey) throw new Error("Falha ao gerar a chave.");
  return { apiKey };
}

async function revokeCredential(credentialId: string) {
  const res = await fetch("/api/settings/enterprise/credentials/revoke", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ credentialId }),
  });
  if (res.status === 403) throw new Error("Sem permissão.");
  if (res.status === 404) throw new Error("Credencial não encontrada.");
  if (!res.ok) throw new Error("Não foi possível revogar agora.");
  return res.json().catch(() => null);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function normalizeScopesInput(input: string) {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    )
  ).slice(0, 50);
}

export function EnterpriseCredentialsCard() {
  const [loading, setLoading] = React.useState(true);
  const [forbidden, setForbidden] = React.useState(false);
  const [credentials, setCredentials] = React.useState<Credential[]>([]);
  const [name, setName] = React.useState("ERP");
  const [scopes, setScopes] = React.useState("transactions:write");
  const [apiKeyOnce, setApiKeyOnce] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const r = await readCredentials();
    if (!r.ok) {
      setForbidden(r.status === 403);
      setCredentials([]);
      setLoading(false);
      return;
    }
    setForbidden(false);
    setCredentials(r.credentials);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return (
    <Card className="bg-card/70 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-base">API Enterprise</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Gere credenciais para integração via API. A chave é exibida apenas uma vez, no momento da criação.
        </div>

        {forbidden ? (
          <div className="rounded-xl border border-white/10 bg-background/20 p-3 text-sm text-muted-foreground backdrop-blur">
            Sem permissão para gerenciar credenciais.
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border bg-background/10 p-4 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="enterprise-cred-name">Nome</Label>
                <Input id="enterprise-cred-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enterprise-cred-scopes">Scopes (separados por vírgula)</Label>
                <Input
                  id="enterprise-cred-scopes"
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                  placeholder="transactions:write"
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending}
                className="h-10"
                onClick={() => {
                  const scopesArr = normalizeScopesInput(scopes);
                  const nm = name.trim();
                  if (nm.length < 2) return toast.error("Informe um nome.");
                  if (!scopesArr.length) return toast.error("Informe ao menos 1 scope.");
                  setApiKeyOnce(null);
                  startTransition(() => {
                    createCredential({ name: nm, scopes: scopesArr })
                      .then(async (r) => {
                        setApiKeyOnce(r.apiKey);
                        await refresh();
                        toast.success("Credencial criada. Copie a chave agora.");
                      })
                      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao criar credencial."));
                  });
                }}
              >
                {pending ? "Gerando..." : "Gerar credencial"}
              </Button>

              {apiKeyOnce ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(apiKeyOnce)
                      .then(() => toast.success("Chave copiada."))
                      .catch(() => toast.error("Não foi possível copiar."));
                  }}
                >
                  Copiar chave
                </Button>
              ) : null}
            </div>

            {apiKeyOnce ? (
              <div className="space-y-1">
                <Label>Chave (visível apenas agora)</Label>
                <Input value={apiKeyOnce} readOnly className="h-10 font-mono text-xs" />
              </div>
            ) : null}
          </div>
        )}

        <div className="rounded-2xl border bg-background/10 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Credenciais</div>
            <Badge variant="secondary">{loading ? "—" : credentials.length}</Badge>
          </div>

          <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "secondary" : "outline"}>{c.status === "active" ? "Ativa" : "Desativada"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.scopes.join(", ")}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {c.status === "active" && !forbidden ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9"
                          disabled={pending}
                          onClick={() => {
                            startTransition(() => {
                              revokeCredential(c.id)
                                .then(async () => {
                                  await refresh();
                                  toast.success("Credencial revogada.");
                                })
                                .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao revogar."));
                            });
                          }}
                        >
                          Revogar
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && credentials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma credencial criada ainda.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

