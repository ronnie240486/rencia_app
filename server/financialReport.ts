export type ReportPayment = {
  amount: string | number;
  status: "paid" | "pending" | "overdue";
  createdAt: Date;
  paidAt?: Date | null;
  dueDate?: Date | string | null;
};

export type FinancialReport = {
  billed: number;
  received: number;
  pending: number;
  overdue: number;
  paymentCount: number;
  byMonth: Array<{ month: string; received: number; billed: number }>;
};

function isWithinPeriod(date: Date | null | undefined, start?: string, end?: string) {
  if (!date) return false;
  const key = date.toISOString().slice(0, 10);
  return (!start || key >= start) && (!end || key <= end);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function buildFinancialReport(rows: ReportPayment[], period: { start?: string; end?: string } = {}): FinancialReport {
  const report: FinancialReport = { billed: 0, received: 0, pending: 0, overdue: 0, paymentCount: 0, byMonth: [] };
  const months = new Map<string, { received: number; billed: number }>();
  for (const payment of rows) {
    const amount = Number(payment.amount) || 0;
    const wasCreatedInPeriod = isWithinPeriod(payment.createdAt, period.start, period.end);
    const wasPaidInPeriod = payment.status === "paid" && isWithinPeriod(payment.paidAt, period.start, period.end);
    if (wasCreatedInPeriod) {
      report.billed += amount;
      report.paymentCount += 1;
      if (payment.status === "pending") report.pending += amount;
      if (payment.status === "overdue") report.overdue += amount;
      const month = monthKey(payment.createdAt);
      const current = months.get(month) ?? { received: 0, billed: 0 };
      current.billed += amount;
      months.set(month, current);
    }
    if (wasPaidInPeriod && payment.paidAt) {
      report.received += amount;
      const month = monthKey(payment.paidAt);
      const current = months.get(month) ?? { received: 0, billed: 0 };
      current.received += amount;
      months.set(month, current);
    }
  }
  report.byMonth = Array.from(months.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([month, values]) => ({ month, ...values }));
  return report;
}
