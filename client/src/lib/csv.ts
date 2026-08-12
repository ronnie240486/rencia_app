import { buildCsv, type CsvValue } from "@shared/csv";

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const blob = new Blob([buildCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
