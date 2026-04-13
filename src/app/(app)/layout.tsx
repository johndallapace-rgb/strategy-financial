import { AppShell } from "@/components/app-shell";
import { requireAuthContext } from "@/lib/auth";
import { getSubscriptionAccess } from "@/lib/subscription";
import { redirect } from "next/navigation";

function isPlaceholderOrgName(name: string) {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return n === "espaco de trabalho";
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuthContext();
  if (!auth.user.phone || !auth.user.name || isPlaceholderOrgName(auth.organization.name)) redirect("/onboarding/complete");
  const access = await getSubscriptionAccess(auth.organization.id);
  if (!access.ok) redirect("/billing");
  return <AppShell>{children}</AppShell>;
}
