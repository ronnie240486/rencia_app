export type ResellerBillingStatus = "pending" | "paid" | "overdue";

export function getResellerBillingStatus(status: ResellerBillingStatus, dueDate: Date | string, now = new Date()): ResellerBillingStatus {
  if (status === "paid") return "paid";
  const due = new Date(`${typeof dueDate === "string" ? dueDate.slice(0, 10) : dueDate.toISOString().slice(0, 10)}T23:59:59.999Z`);
  return due.getTime() < now.getTime() ? "overdue" : status;
}

export function addBillingMonths(dueDate: Date | string, months: number): string {
  const value = typeof dueDate === "string" ? dueDate.slice(0, 10) : dueDate.toISOString().slice(0, 10);
  const [year, month, day] = value.split("-").map(Number);
  const targetMonthIndex = month - 1 + Math.max(1, months);
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const normalizedDay = Math.min(day, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(normalizedDay).padStart(2, "0")}`;
}
