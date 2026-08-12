import { toDateOnly } from "../shared/dateOnly";

export type PaymentStatus = "pending" | "paid" | "overdue";

export function getEffectivePaymentStatus(status: PaymentStatus, dueDate: string | Date | null, reference = new Date()): PaymentStatus {
  if (status !== "pending" || !dueDate) return status;
  const due = toDateOnly(dueDate);
  const today = toDateOnly(reference);
  return due && due < today ? "overdue" : "pending";
}
