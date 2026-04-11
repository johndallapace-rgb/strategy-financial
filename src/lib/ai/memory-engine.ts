"use server";

export async function loadLongMemory() {
  return { ok: false as const, reason: "disabled" as const };
}

export async function writeLongMemory() {
  return { ok: false as const, reason: "disabled" as const };
}

