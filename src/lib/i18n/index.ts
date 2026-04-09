import { ptBR } from "@/lib/i18n/pt-BR";

const dictionaries = {
  "pt-BR": ptBR,
} as const;

export type SupportedLocale = keyof typeof dictionaries;
export type I18nKey = keyof typeof ptBR;

export function t(key: I18nKey, vars?: Record<string, string | number>, locale: SupportedLocale = "pt-BR") {
  const template = dictionaries[locale][key] ?? String(key);
  if (!vars) return template;
  return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, String(vars[k]!)), template);
}

