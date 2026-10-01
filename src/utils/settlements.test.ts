import assert from "node:assert/strict";
import test from "node:test";
import { Expense } from "../types";
import { allocateSettlement } from "./settlements";

const expense = (id: string, amount: number, overrides: Partial<Expense> = {}): Expense => ({
  _id: id,
  userId: "user-a",
  projectName: id,
  clientName: "Client",
  category: "Travel",
  amount,
  paidAmount: 0,
  remainingAmount: amount,
  settlementStatus: "unpaid",
  date: `2026-05-${String(Number(id.replace(/\D/g, "")) || 1).padStart(2, "0")}`,
  paymentMode: "UPI",
  description: "Test expense",
  status: "approved",
  createdAt: `2026-05-${String(Number(id.replace(/\D/g, "")) || 1).padStart(2, "0")}T00:00:00.000Z`,
  updatedAt: `2026-05-${String(Number(id.replace(/\D/g, "")) || 1).padStart(2, "0")}T00:00:00.000Z`,
  ...overrides
});

test("overpayment leaves unallocated balance", () => {
  const result = allocateSettlement([expense("e1", 1725)], 1800);
  assert.equal(result.allocatedAmount, 1725);
  assert.equal(result.unallocatedAmount, 75);
  assert.equal(result.allocations[0].newPaidAmount, 1725);
  assert.equal(result.allocations[0].remainingAmount, 0);
  assert.equal(result.allocations[0].settlementStatus, "paid");
});

test("partial payment leaves remaining amount", () => {
  const result = allocateSettlement([expense("e1", 1725)], 1000);
  assert.equal(result.allocatedAmount, 1000);
  assert.equal(result.unallocatedAmount, 0);
  assert.equal(result.allocations[0].newPaidAmount, 1000);
  assert.equal(result.allocations[0].remainingAmount, 725);
  assert.equal(result.allocations[0].settlementStatus, "partially_paid");
});

test("oldest first allocation pays first two expenses", () => {
  const result = allocateSettlement([expense("e3", 900), expense("e1", 500), expense("e2", 700)], 1200);
  assert.deepEqual(result.allocations.map((item) => [item.expenseId, item.newPaidAmount, item.settlementStatus]), [
    ["e1", 500, "paid"],
    ["e2", 700, "paid"]
  ]);
});

test("oldest first allocation partially pays third expense", () => {
  const result = allocateSettlement([expense("e1", 500), expense("e2", 700), expense("e3", 900)], 1500);
  assert.deepEqual(result.allocations.map((item) => [item.expenseId, item.newPaidAmount, item.remainingAmount, item.settlementStatus]), [
    ["e1", 500, 0, "paid"],
    ["e2", 700, 0, "paid"],
    ["e3", 300, 600, "partially_paid"]
  ]);
});

test("pending rejected and already paid expenses are skipped", () => {
  const result = allocateSettlement([
    expense("e1", 500, { status: "pending_manager" }),
    expense("e2", 700, { status: "rejected" }),
    expense("e3", 900, { paidAmount: 900, remainingAmount: 0, settlementStatus: "paid" }),
    expense("e4", 300)
  ], 1000);
  assert.deepEqual(result.allocations.map((item) => item.expenseId), ["e4"]);
  assert.equal(result.unallocatedAmount, 700);
});

test("zero and negative payment produce no allocations", () => {
  assert.equal(allocateSettlement([expense("e1", 500)], 0).allocations.length, 0);
  assert.equal(allocateSettlement([expense("e1", 500)], -20).allocations.length, 0);
});

test("allocation is scoped by caller to one user", () => {
  const userA = expense("e1", 500, { userId: "user-a" });
  const userB = expense("e2", 700, { userId: "user-b" });
  const result = allocateSettlement([userA, userB].filter((item) => item.userId === "user-a"), 900);

  assert.deepEqual(result.allocations.map((item) => item.expenseId), ["e1"]);
  assert.equal(result.allocatedAmount, 500);
  assert.equal(result.unallocatedAmount, 400);
});

test("existing partial expense receives only remaining amount", () => {
  const result = allocateSettlement([
    expense("e1", 1000, { paidAmount: 400, remainingAmount: 600, settlementStatus: "partially_paid" }),
    expense("e2", 500)
  ], 700);

  assert.deepEqual(result.allocations.map((item) => [item.expenseId, item.previousPaidAmount, item.allocatedAmount, item.newPaidAmount, item.remainingAmount, item.settlementStatus]), [
    ["e1", 400, 600, 1000, 0, "paid"],
    ["e2", 0, 100, 100, 400, "partially_paid"]
  ]);
});

test("invalid amount string produces safe empty allocation", () => {
  const result = allocateSettlement([expense("e1", 500)], "not a number");
  assert.equal(result.receivedAmount, 0);
  assert.equal(result.allocations.length, 0);
});

test("overpayment across multiple expenses creates unallocated amount", () => {
  const result = allocateSettlement([expense("e1", 500), expense("e2", 700), expense("e3", 900)], 2500);
  assert.equal(result.allocatedAmount, 2100);
  assert.equal(result.unallocatedAmount, 400);
  assert.deepEqual(result.allocations.map((item) => item.settlementStatus), ["paid", "paid", "paid"]);
});

test("no eligible expenses returns empty allocations", () => {
  const result = allocateSettlement([
    expense("e1", 500, { status: "pending_manager" }),
    expense("e2", 700, { status: "rejected" }),
    expense("e3", 900, { paidAmount: 900, remainingAmount: 0, settlementStatus: "paid" })
  ], 1000);

  assert.equal(result.allocatedAmount, 0);
  assert.equal(result.unallocatedAmount, 1000);
  assert.equal(result.allocations.length, 0);
});

test("newest first allocation pays newest expenses first", () => {
  const result = allocateSettlement([expense("e1", 500), expense("e2", 700), expense("e3", 900)], 1200, "newest_first");

  assert.deepEqual(result.allocations.map((item) => [item.expenseId, item.allocatedAmount, item.settlementStatus]), [
    ["e3", 900, "paid"],
    ["e2", 300, "partially_paid"]
  ]);
});

test("highest amount first allocation pays largest remaining balance first", () => {
  const result = allocateSettlement([expense("e1", 500), expense("e2", 700), expense("e3", 900)], 1200, "highest_amount_first");

  assert.deepEqual(result.allocations.map((item) => [item.expenseId, item.allocatedAmount, item.remainingAmount, item.settlementStatus]), [
    ["e3", 900, 0, "paid"],
    ["e2", 300, 400, "partially_paid"]
  ]);
});

test("highest amount first uses remaining amount on partially paid expenses", () => {
  const result = allocateSettlement([
    expense("e1", 1000, { paidAmount: 600, remainingAmount: 400, settlementStatus: "partially_paid" }),
    expense("e2", 700),
    expense("e3", 900, { paidAmount: 300, remainingAmount: 600, settlementStatus: "partially_paid" })
  ], 800, "highest_amount_first");

  assert.deepEqual(result.allocations.map((item) => [item.expenseId, item.allocatedAmount, item.remainingAmount, item.settlementStatus]), [
    ["e2", 700, 0, "paid"],
    ["e3", 100, 500, "partially_paid"]
  ]);
});

test("allocation never overpays an expense with inconsistent remaining amount", () => {
  const result = allocateSettlement([
    expense("e1", 1000, { paidAmount: 900, remainingAmount: 600, settlementStatus: "partially_paid" })
  ], 500);

  assert.equal(result.allocations[0].allocatedAmount, 100);
  assert.equal(result.allocations[0].newPaidAmount, 1000);
  assert.equal(result.allocations[0].remainingAmount, 0);
  assert.equal(result.unallocatedAmount, 400);
});
