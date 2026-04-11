"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AdminOrgSelect({
  organizations,
  defaultOrgId,
}: {
  organizations: { id: string; name: string }[];
  defaultOrgId: string | null;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const current = search.get("orgId") || defaultOrgId || (organizations[0]?.id ?? "");

  return (
    <Select
      value={current}
      onValueChange={(v) => {
        if (!v) return;
        const params = new URLSearchParams(search.toString());
        params.set("orgId", v);
        router.push(`/admin/integrations?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-full sm:w-[320px]">
        <SelectValue placeholder="Selecione uma organização" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
