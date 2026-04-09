import { AppShell } from "@/components/app-shell";
import { requireAuthContext } from "@/lib/auth";
import { getSubscriptionAccess } from "@/lib/subscription";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuthContext();
  const access = await getSubscriptionAccess(auth.organization.id);
  if (!access.ok) redirect("/billing");
  return <AppShell>{children}</AppShell>;
}
