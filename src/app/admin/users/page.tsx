import { db } from "@/lib/db";
import { requireAdmin } from "@/app/admin/actions/auth";
import { Button } from "@/components/ui/button";
import { deactivateUserAction, hardDeleteUserAction, removeMembershipAction } from "@/app/admin/actions/users";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export default async function AdminUsersPage() {
  await requireAdmin();

  const rows = await db.membership.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      createdAt: true,
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          subscription: { select: { plan: true, status: true } },
        },
      },
      user: { select: { id: true, email: true, name: true } },
    },
  });
  const userIds = Array.from(new Set(rows.map((r) => r.user.id)));
  const lastSessions = await db.session.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _max: { createdAt: true },
  });
  const lastActiveByUser = new Map(lastSessions.map((s) => [s.userId, s._max.createdAt]));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xl font-semibold tracking-tight text-foreground">Usuários</div>
        <div className="text-sm text-muted-foreground">Lista por vínculo (usuário x organização).</div>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-border/50">
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Email</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Organização</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Plano</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Role</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Última atividade</th>
                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Criado</th>
                <th className="h-10 w-[320px] px-4 text-right font-medium text-muted-foreground whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="text-foreground">{r.user.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.user.name ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.organization.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.organization.subscription?.plan ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.organization.subscription?.status ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.role}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{lastActiveByUser.get(r.user.id) ? formatDate(lastActiveByUser.get(r.user.id)!) : "—"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <form
                        action={async (formData) => {
                          "use server";
                          const userId = String(formData.get("userId") || "");
                          await deactivateUserAction({ userId });
                        }}
                      >
                        <input type="hidden" name="userId" value={r.user.id} />
                        <Button type="submit" variant="outline" className="h-9 rounded-xl">
                          Desativar
                        </Button>
                      </form>
                      <form
                        action={async (formData) => {
                          "use server";
                          const membershipId = String(formData.get("membershipId") || "");
                          await removeMembershipAction({ membershipId });
                        }}
                      >
                        <input type="hidden" name="membershipId" value={r.id} />
                        <Button type="submit" variant="outline" className="h-9 rounded-xl">
                          Remover vínculo
                        </Button>
                      </form>
                      <form
                        action={async (formData) => {
                          "use server";
                          const userId = String(formData.get("userId") || "");
                          await hardDeleteUserAction({ userId });
                        }}
                      >
                        <input type="hidden" name="userId" value={r.user.id} />
                        <Button type="submit" variant="destructive" className="h-9 rounded-xl">
                          Excluir usuário
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-background/10 px-4 py-3 text-xs text-muted-foreground">
        Desativar encerra as sessões ativas. Remover remove os vínculos do usuário com organizações e encerra sessões.
      </div>
    </div>
  );
}
