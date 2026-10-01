import { Expense, PaymentSettlementAllocation } from "../types";
import { toAmount } from "./formatters";

export type AllocationMode = "oldest_first" | "newest_first" | "highest_amount_first";
export type SettlementStatus = "unpaid" | "partially_paid" | "paid";

export type SettlementInput = {
  expenses: Expense[];
  receivedAmount: unknown;
  allocationMode?: AllocationMode;
};

export type SettlementAllocation = PaymentSettlementAllocation;

export type SettlementPreview = {
  receivedAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  allocations: SettlementAllocation[];
};

export type SettlementResult = SettlementPreview;

export const sortSettlementExpenses = (expenses: Expense[], mode: AllocationMode = "oldest_first") =>
  expenses.slice().sort((a, b) => {
    if (mode === "newest_first") return (b.date || b.createdAt).localeCompare(a.date || a.createdAt);
    if (mode === "highest_amount_first") return b.remainingAmount - a.remainingAmount;
    return (a.date || a.createdAt).localeCompare(b.date || b.createdAt);
  });

export const allocateSettlement = (
  expenses: Expense[],
  receivedAmountInput: unknown,
  mode: AllocationMode = "oldest_first"
): SettlementResult => {
  const receivedAmount = toAmount(receivedAmountInput);
  if (receivedAmount <= 0) {
    return { receivedAmount, allocatedAmount: 0, unallocatedAmount: 0, allocations: [] as PaymentSettlementAllocation[] };
  }

  let remainingReceived = receivedAmount;
  const eligibleExpenses = sortSettlementExpenses(
    expenses.filter((expense) => expense.status === "approved" && expense.remainingAmount > 0),
    mode
  );
  const allocations: PaymentSettlementAllocation[] = [];

  for (const expense of eligibleExpenses) {
    if (remainingReceived <= 0) break;

    const previousPaidAmount = Math.min(expense.amount, Math.max(0, toAmount(expense.paidAmount)));
    const unpaidAmount = Math.max(0, expense.amount - previousPaidAmount);
    if (unpaidAmount <= 0) continue;

    const allocatedAmount = Math.min(unpaidAmount, remainingReceived);
    const newPaidAmount = Math.min(expense.amount, previousPaidAmount + allocatedAmount);
    const remainingAmount = Math.max(0, expense.amount - newPaidAmount);

    allocations.push({
      expenseId: expense._id,
      expenseTitle: expense.projectName,
      expenseAmount: expense.amount,
      allocatedAmount,
      previousPaidAmount,
      newPaidAmount,
      remainingAmount,
      settlementStatus: remainingAmount <= 0 ? "paid" : "partially_paid"
    });

    remainingReceived -= allocatedAmount;
  }

  const allocatedAmount = allocations.reduce((sum, item) => sum + item.allocatedAmount, 0);
  return {
    receivedAmount,
    allocatedAmount,
    unallocatedAmount: Math.max(0, receivedAmount - allocatedAmount),
    allocations
  };
};
