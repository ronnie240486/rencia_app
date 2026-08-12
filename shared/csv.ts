export type CsvValue = string | number | boolean | Date | null | undefined;

function escapeCell(value: CsvValue) {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function buildCsv(headers: string[], rows: CsvValue[][]) {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n")}`;
}
