"use server";

import { db } from "@/lib/db";

export async function getOrganizationFeatureConfig(organizationId: string) {
  return db.organizationFeatureConfig.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
}

