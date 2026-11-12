export const CLIENT_FILTERS = ["all", "expired", "today", "week", "blocked", "inactive"] as const;
export type ClientFilter = (typeof CLIENT_FILTERS)[number];

export const CLIENT_FILTER_LABELS: Record<ClientFilter, string> = {
  all: "Todos",
  expired: "Vencidos",
  today: "Vencem hoje",
  week: "Vencem em 7 dias",
  blocked: "Bloqueados",
  inactive: "Sem usar há 30 dias",
};

/** Data de hoje no fuso de Brasília (AAAA-MM-DD). O servidor roda em UTC e viraria "amanhã" depois das 21h. */
export function brazilToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDaysToIsoDate(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
