export type ResellerFinancialRow = { amount: string | number; status: "pending" | "paid" | "overdue"; dueDate: Date | string | null };

export function summarizeResellerFinance(rows: ResellerFinancialRow[], now = new Date()) {
  return rows.reduce((summary, row) => {
    const amount = Number(row.amount) || 0;
    const due = row.dueDate ? new Date(row.dueDate) : null;
    const overdue = row.status === "overdue" || (row.status === "pending" && !!due && due.getTime() < now.getTime());
    summary.total += amount;
    if (row.status === "paid") summary.received += amount;
    else if (overdue) summary.overdue += amount;
    else summary.pending += amount;
    return summary;
  }, { total: 0, received: 0, pending: 0, overdue: 0 });
}
