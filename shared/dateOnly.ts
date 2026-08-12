/** Trata datas de vencimento como datas de calendário, sem conversão de fuso horário. */
export function toDateOnly(value: string | Date | null | undefined): string {
  if (!value) return "";

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Cria uma data ao meio-dia local para não gravar o dia anterior no banco. */
export function dateOnlyForDatabase(value: string): Date {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) throw new Error("Data de vencimento inválida");
  return new Date(`${dateOnly}T12:00:00`);
}

export function formatDateOnlyPtBr(value: string | Date | null | undefined): string {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return "—";
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
}

export function daysUntilDateOnly(value: string | Date, reference = new Date()): number {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return NaN;
  const [year, month, day] = dateOnly.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  const current = Date.UTC(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return Math.round((start - current) / 86_400_000);
}
