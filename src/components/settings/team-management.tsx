"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { createInviteAction, acceptInviteAction, revokeInviteAction, removeMemberAction, updateMemberRoleAction } from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CopyIcon, Trash2Icon } from "lucide-react";
import { t } from "@/lib/i18n";

type Role = "owner" | "admin" | "member";

function roleLabel(role: Role) {
  if (role === "owner") return t("role.owner");
  if (role === "admin") return t("role.admin");
  return t("role.member");
}

function FormButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10">
      {pending ? t("common.wait") : children}
    </Button>
  );
}

export function TeamManagement({
  currentRole,
  members,
  invites,
}: {
  currentRole: Role;
  members: Array<{ userId: string; email: string; role: Role }>;
  invites: Array<{ id: string; email: string; role: Role; createdAt: string }>;
}) {
  const [inviteState, inviteAction] = React.useActionState(createInviteAction, null);
  const [acceptState, acceptAction] = React.useActionState(acceptInviteAction, null);

  const canManage = currentRole === "owner" || currentRole === "admin";
  const [origin, setOrigin] = React.useState<string | null>(null);

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const inviteLink = inviteState?.token && origin ? `${origin}/invite?code=${encodeURIComponent(inviteState.token)}` : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card/70 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Membros</div>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="w-[160px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell className="font-medium">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "owner" ? "secondary" : "outline"}>{roleLabel(m.role)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <div className="flex justify-end gap-2">
                        <form action={updateMemberRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={m.userId} />
                          <select
                            name="role"
                            defaultValue={m.role}
                            className="h-9 rounded-xl border border-white/10 bg-background/20 px-2 text-sm backdrop-blur"
                          >
                            <option value="owner">{t("role.owner")}</option>
                            <option value="admin">{t("role.admin")}</option>
                            <option value="member">{t("role.member")}</option>
                          </select>
                          <Button type="submit" variant="outline" className="h-9 rounded-xl">
                            Salvar
                          </Button>
                        </form>
                        <form action={removeMemberAction}>
                          <input type="hidden" name="userId" value={m.userId} />
                          <Button type="submit" variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                            <Trash2Icon className="size-4" />
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum membro encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card/70 p-4 backdrop-blur">
          <div className="text-sm font-semibold">Convidar membro</div>
          <div className="mt-1 text-sm text-muted-foreground">Gere um código e compartilhe com a pessoa.</div>

          <form action={inviteAction} className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="inviteEmail">E-mail</Label>
              <Input id="inviteEmail" name="email" placeholder="pessoa@empresa.com" className="h-11 rounded-xl bg-background/35 backdrop-blur" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inviteRole">Função</Label>
              <select
                id="inviteRole"
                name="role"
                defaultValue="member"
                className="h-11 rounded-xl border border-white/10 bg-background/20 px-3 text-sm backdrop-blur"
              >
                <option value="member">{t("role.member")}</option>
                <option value="admin">{t("role.admin")}</option>
                <option value="owner">{t("role.owner")}</option>
              </select>
            </div>
            {inviteState?.error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {inviteState.error}
              </div>
            ) : null}
            {inviteState?.token ? (
              <div className="space-y-2">
                <div className="rounded-xl border bg-background/20 p-3">
                  <div className="text-xs text-muted-foreground">Link do convite</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="min-w-0 flex-1 truncate font-mono text-sm">{inviteLink ?? ""}</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={async () => {
                        if (!inviteLink) return;
                        await navigator.clipboard.writeText(inviteLink);
                      }}
                      aria-label="Copiar link"
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border bg-background/20 p-3">
                  <div className="text-xs text-muted-foreground">Código do convite</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="min-w-0 flex-1 truncate font-mono text-sm">{inviteState.token}</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={async () => {
                        await navigator.clipboard.writeText(inviteState.token ?? "");
                      }}
                      aria-label="Copiar código"
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <FormButton>Criar convite</FormButton>
          </form>
        </div>

        <div className="rounded-2xl border bg-card/70 p-4 backdrop-blur">
          <div className="text-sm font-semibold">Entrar em uma empresa</div>
          <div className="mt-1 text-sm text-muted-foreground">Cole o código recebido para adicionar a empresa à sua conta.</div>

          <form action={acceptAction} className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="inviteCode">Código</Label>
              <Input id="inviteCode" name="code" className="h-11 rounded-xl bg-background/35 backdrop-blur" required />
            </div>
            {acceptState?.error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {acceptState.error}
              </div>
            ) : null}
            {acceptState?.ok ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                Empresa adicionada com sucesso. Atualize a página para alternar.
              </div>
            ) : null}
            <FormButton>Entrar</FormButton>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border bg-card/70 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Convites pendentes</div>
          <Badge variant="secondary">{invites.length}</Badge>
        </div>

        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{roleLabel(i.role)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="inviteId" value={i.id} />
                        <Button type="submit" variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                          <Trash2Icon className="size-4" />
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhum convite pendente.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
