import { z } from "zod";

export const entityTypeSchema = z.enum(["pf", "pj"]);
export const transactionTypeSchema = z.enum(["income", "expense"]);
export const accountTypeSchema = z.enum(["pf", "pj"]);

export const accountUpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: accountTypeSchema,
});

export const costCenterUpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const categoryUpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: transactionTypeSchema,
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  icon: z.string().trim().min(1).max(48),
});

export const transactionUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  amount: z.string().trim().min(1).max(32),
  type: transactionTypeSchema,
  date: z.string().trim().min(10).max(10),
  dueDate: z.string().trim().min(10).max(10).optional().or(z.literal("")),
  entityType: entityTypeSchema,
  source: z.string().trim().min(2).max(80),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional().or(z.literal("")),
  accountId: z.string().uuid().optional(),
  costCenterId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  kind: z.enum(["fixed", "variable"]),
  makeRecurring: z.boolean().default(false),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
});

export const recurringRuleUpsertSchema = z.object({
  transactionName: z.string().trim().min(2).max(120),
  amount: z.string().trim().min(1).max(32),
  type: transactionTypeSchema,
  entityType: entityTypeSchema,
  source: z.string().trim().min(2).max(80),
  categoryId: z.string().uuid(),
  dayOfMonth: z.number().int().min(1).max(31),
  active: z.boolean().default(true),
});

export const alertRuleSchema = z.object({
  entityType: entityTypeSchema,
  criticalPercent: z.number().int().min(1).max(100),
});
