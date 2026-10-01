import { addDoc, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { auditService } from "./audit.service";
import {
  canApproveExpenses,
  canPayExpenses,
  canSettleExpenses,
  cleanRecord,
  collections,
  companyCollection,
  companyDoc,
  mapUserDoc,
  mapExpenseDoc,
  nowIso
} from "./firestore.utils";
import { db } from "./firebase";
import { useAuthStore } from "../store/auth.store";
import { Expense, ExpenseForm, PagedResponse, PaymentSettlement, PaymentSettlementInput, PaymentSettlementAllocation } from "../types";
import { toAmount } from "../utils/formatters";
import { allocateSettlement } from "../utils/settlements";
import { sanitizeText, validateExpense } from "../utils/validators";

type ListParams = { page?: number; limit?: number; search?: string; status?: string; category?: string; paymentMode?: string; userId?: string };

const currentUser = () => {
  const user = useAuthStore.getState().user;
  if (!user?._id || !user.companyId) throw new Error("Please login again.");
  return user;
};

const expenseRef = (companyId: string, id: string) => doc(companyDoc(companyId), collections.expenses, id);
const settlementRef = (companyId: string) => doc(companyCollection(companyId, "paymentSettlements"));

const loadExpenses = async () => {
  const user = currentUser();
  const base = companyCollection(user.companyId, "expenses");
  const expensesQuery = user.role === "employee" ? query(base, where("userId", "==", user._id)) : query(base);
  const snapshot = await getDocs(expensesQuery);
  return snapshot.docs.map(mapExpenseDoc).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

const matchesSearch = (expense: Expense, search?: string) => {
  const term = search?.trim().toLowerCase();
  if (!term) return true;
  const user = typeof expense.userId === "object" ? expense.userId : undefined;
  return [expense.projectName, expense.clientName, expense.description, expense.category, expense.paymentMode, user?.name, user?.department, user?.email]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
};

const ownerIdOf = (expense: Expense) => (typeof expense.userId === "object" ? expense.userId._id || expense.userId.id || expense.userId.authUid || "" : expense.userId);
const ownerOf = (expense: Expense) => (typeof expense.userId === "object" ? expense.userId : undefined);
const editableExpenseFields = ["amount", "date", "category", "projectName", "clientName", "paymentMode", "description", "receiptUrl", "receiptPublicId", "receiptType"] as const;
const userIds = (value?: { _id?: string; id?: string; authUid?: string }) => [value?._id, value?.id, value?.authUid].filter(Boolean) as string[];

export const expenseService = {
  list: async (params: ListParams): Promise<PagedResponse<Expense>> => {
    const page = params.page || 1;
    const limit = params.limit || 12;
    const filtered = (await loadExpenses()).filter((expense) => {
      const statusOk =
        !params.status ||
        params.status === "all" ||
        expense.status === params.status ||
        expense.settlementStatus === params.status;
      const categoryOk = !params.category || params.category === "all" || expense.category === params.category;
      const paymentOk = !params.paymentMode || params.paymentMode === "all" || expense.paymentMode === params.paymentMode;
      const userOk = !params.userId || params.userId === "all" || ownerIdOf(expense) === params.userId;
      return statusOk && categoryOk && paymentOk && userOk && matchesSearch(expense, params.search);
    });
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    return { items, page, limit, total: filtered.length, hasMore: start + limit < filtered.length };
  },
  create: async (form: ExpenseForm) => {
    const user = currentUser();
    const sanitizedForm: ExpenseForm = {
      ...form,
      projectName: sanitizeText(form.projectName, 100),
      clientName: sanitizeText(form.clientName, 100),
      description: sanitizeText(form.description, 500)
    };
    const errors = validateExpense(sanitizedForm);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0] || "Please check the expense details.");
    const timestamp = nowIso();
    const userSnapshot = cleanRecord({
      _id: user._id,
      authUid: user.authUid,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      companyId: user.companyId
    } as Record<string, unknown>);
    const payload = cleanRecord({
      ...form,
      ...sanitizedForm,
      amount: toAmount(sanitizedForm.amount),
      paidAmount: 0,
      remainingAmount: toAmount(sanitizedForm.amount),
      settlementStatus: "unpaid",
      settlementIds: [],
      userId: user._id,
      user: userSnapshot,
      status: "pending_manager",
      approvalLevel: 0,
      requiredApprovals: 1,
      approvedByUserIds: [],
      createdAt: timestamp,
      updatedAt: timestamp
    });
    const ref = await addDoc(companyCollection(user.companyId, "expenses"), payload);
    await auditService.record("expense.created", { type: "expense", id: ref.id, label: sanitizedForm.projectName }, { amount: toAmount(sanitizedForm.amount) });
    return expenseService.get(ref.id);
  },
  get: async (id: string) => {
    const user = currentUser();
    const snapshot = await getDoc(expenseRef(user.companyId, id));
    if (!snapshot.exists()) throw new Error("Expense not found.");
    const expense = mapExpenseDoc(snapshot);
    if (user.role === "employee" && ownerIdOf(expense) !== user._id) {
      throw new Error("You do not have access to this expense.");
    }
    return expense;
  },
  update: async (id: string, payload: Partial<ExpenseForm> & Record<string, unknown>) => {
    const user = currentUser();
    const current = await expenseService.get(id);
    const nextStatus = payload.status;

    if (nextStatus === "approved" && !canApproveExpenses(user)) throw new Error("Manager or admin access required to approve.");
    if (nextStatus === "paid" && !canPayExpenses(user)) throw new Error("Admin access required to mark paid.");
    if (nextStatus === "rejected" && !canApproveExpenses(user)) throw new Error("Manager or admin access required to reject.");
    if ((nextStatus === "approved" || nextStatus === "rejected") && userIds(user).includes(ownerIdOf(current))) {
      throw new Error("You cannot approve or reject your own expense.");
    }
    if (nextStatus === "approved" && current.status !== "pending_manager") throw new Error("Only pending expenses can be approved.");
    if (nextStatus === "rejected" && !["pending_manager", "approved"].includes(current.status)) throw new Error("Only pending or approved expenses can be rejected.");
    if (nextStatus === "paid" && current.status !== "approved") throw new Error("Only approved expenses can be marked paid.");

    let updatePayload: Record<string, unknown>;

    if (nextStatus === "approved") {
      updatePayload = {
        status: "approved",
        approvalLevel: Math.max(current.approvalLevel || 0, 1),
        approvedBy: user._id,
        approvedByUser: user,
        approvedByUserIds: Array.from(new Set([...(current.approvedByUserIds || []), user._id])),
        approvedAt: nowIso(),
        rejectionReason: ""
      };
    } else if (nextStatus === "paid") {
      updatePayload = { status: "paid", paidBy: user._id, paidByUser: user, paidAt: nowIso(), paidAmount: current.amount, remainingAmount: 0, settlementStatus: "paid" };
    } else if (nextStatus === "rejected") {
      const rejectionReason = sanitizeText(String(payload.rejectionReason || ""), 300);
      if (!rejectionReason) throw new Error("A rejection reason is required.");
      updatePayload = { status: "rejected", rejectionReason };
    } else {
      if (user.role === "employee" && ownerIdOf(current) !== user._id) throw new Error("You can only edit your own expenses.");
      if (current.status !== "pending_manager") throw new Error("Only pending expenses can be edited.");
      const draft = editableExpenseFields.reduce<Record<string, unknown>>((acc, key) => {
        if (payload[key] !== undefined) acc[key] = payload[key];
        return acc;
      }, {});
      const nextForm: ExpenseForm = {
        amount: String(draft.amount ?? current.amount),
        date: String(draft.date ?? current.date),
        category: (draft.category ?? current.category) as ExpenseForm["category"],
        projectName: sanitizeText(String(draft.projectName ?? current.projectName), 100),
        clientName: sanitizeText(String(draft.clientName ?? current.clientName), 100),
        paymentMode: (draft.paymentMode ?? current.paymentMode) as ExpenseForm["paymentMode"],
        description: sanitizeText(String(draft.description ?? current.description), 500),
        receiptUrl: draft.receiptUrl === undefined ? current.receiptUrl : String(draft.receiptUrl || ""),
        receiptPublicId: draft.receiptPublicId === undefined ? current.receiptPublicId : String(draft.receiptPublicId || ""),
        receiptType: draft.receiptType === undefined ? current.receiptType : String(draft.receiptType || "")
      };
      const errors = validateExpense(nextForm);
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0] || "Please check the expense details.");
      const nextAmount = toAmount(nextForm.amount);
      updatePayload = {
        ...nextForm,
        amount: nextAmount,
        paidAmount: 0,
        remainingAmount: nextAmount,
        settlementStatus: "unpaid",
        settlementIds: []
      };
    }

    await updateDoc(expenseRef(user.companyId, id), cleanRecord({ ...updatePayload, updatedAt: nowIso() }));

    if (nextStatus === "approved") await auditService.record("expense.approved", { type: "expense", id, label: current.projectName }, { amount: current.amount });
    if (nextStatus === "rejected") await auditService.record("expense.rejected", { type: "expense", id, label: current.projectName }, { reason: payload.rejectionReason });
    if (nextStatus === "paid") await auditService.record("expense.paid", { type: "expense", id, label: current.projectName }, { amount: current.amount });

    return expenseService.get(id);
  },
  remove: async (id: string) => {
    const user = currentUser();
    const current = await expenseService.get(id);
    if (user.role === "employee" && ownerIdOf(current) !== user._id) throw new Error("You can only delete your own expenses.");
    if (current.status !== "pending_manager") throw new Error("Only pending expenses can be deleted.");
    await deleteDoc(expenseRef(user.companyId, id));
    return { message: "Expense deleted." };
  },
  settleReceivedAmount: async (input: PaymentSettlementInput): Promise<PaymentSettlement> => {
    const user = currentUser();
    if (!canSettleExpenses(user)) throw new Error("Manager or admin access required to record settlements.");

    const receivedAmount = toAmount(input.receivedAmount);
    if (!receivedAmount || receivedAmount <= 0) throw new Error("Enter a valid received amount.");

    const allExpenses = await loadExpenses();
    const requestedUserId = input.userId?.trim();
    if (!requestedUserId) throw new Error("Select an employee to settle.");
    if (userIds(user).includes(requestedUserId)) throw new Error("You cannot record a settlement for yourself.");
    const targetUserId = requestedUserId;
    if (!targetUserId) throw new Error("Could not determine user for settlement. Please login again.");

    const expenses = allExpenses.filter((expense) => ownerIdOf(expense) === targetUserId);
    let targetUser = targetUserId === user._id ? user : ownerOf(expenses[0]);
    if (!targetUser) {
      const targetSnapshot = await getDoc(doc(companyDoc(user.companyId), collections.users, targetUserId));
      if (targetSnapshot.exists()) targetUser = mapUserDoc(targetSnapshot);
    }
    if (!targetUser || targetUser.companyId !== user.companyId || targetUser.isActive === false || targetUser.approvalStatus === "pending" || targetUser.approvalStatus === "rejected") {
      throw new Error("Selected employee is not an active member of this workspace.");
    }
    const allocation = allocateSettlement(expenses, receivedAmount, input.allocationMode);

    const settlementDoc = settlementRef(user.companyId);
    const settlementId = settlementDoc.id;
    const allocations: PaymentSettlementAllocation[] = allocation.allocations;

    if (!allocations.length) throw new Error("No approved unpaid expenses are available for settlement.");
    const invalidAllocation = allocations.some((item) => {
      const current = expenses.find((expense) => expense._id === item.expenseId);
      return !current ||
        ownerIdOf(current) !== targetUserId ||
        current.status !== "approved" ||
        item.newPaidAmount < 0 ||
        item.newPaidAmount > current.amount ||
        item.remainingAmount !== current.amount - item.newPaidAmount;
    });
    if (invalidAllocation) throw new Error("Settlement allocation failed integrity checks.");

    const timestamp = nowIso();
    const settlement: PaymentSettlement = {
      id: settlementId,
      _id: settlementId,
      companyId: user.companyId,
      userId: targetUserId,
      userName: targetUser?.name || user.name,
      receivedAmount,
      allocatedAmount: allocation.allocatedAmount,
      unallocatedAmount: allocation.unallocatedAmount,
      paymentDate: input.paymentDate || timestamp.slice(0, 10),
      paymentMode: input.paymentMode || undefined,
      referenceNote: input.referenceNote?.trim(),
      createdBy: user._id || user.authUid,
      createdByName: user.name,
      createdAt: timestamp,
      allocations
    };

    const batch = writeBatch(db);
    batch.set(settlementDoc, cleanRecord(settlement as unknown as Record<string, unknown>));
    allocations.forEach((allocation) => {
      const current = expenses.find((expense) => expense._id === allocation.expenseId);
      batch.update(expenseRef(user.companyId, allocation.expenseId), cleanRecord({
        paidAmount: allocation.newPaidAmount,
        remainingAmount: allocation.remainingAmount,
        settlementStatus: allocation.settlementStatus,
        settlementIds: Array.from(new Set([...(current?.settlementIds || []), settlementId])),
        lastSettledAt: timestamp,
        updatedAt: timestamp
      }));
    });
    batch.set(doc(companyCollection(user.companyId, "auditLogs")), cleanRecord({
      action: "expense.settlement_created",
      target: { type: "paymentSettlement", id: settlementId, label: input.referenceNote || "Received amount" },
      metadata: {
        receivedAmount,
        allocatedAmount: settlement.allocatedAmount,
        unallocatedAmount: settlement.unallocatedAmount,
        allocations: allocations.length,
        userId: targetUserId
      },
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      createdAt: timestamp
    }));
    allocations.forEach((allocation) => {
      batch.set(doc(companyCollection(user.companyId, "auditLogs")), cleanRecord({
        action: allocation.settlementStatus === "paid" ? "expense.full_payment_completed" : "expense.partial_payment_applied",
        target: { type: "expense", id: allocation.expenseId, label: allocation.expenseTitle },
        metadata: {
          settlementId,
          targetUserId,
          allocatedAmount: allocation.allocatedAmount,
          previousPaidAmount: allocation.previousPaidAmount,
          newPaidAmount: allocation.newPaidAmount,
          remainingAmount: allocation.remainingAmount
        },
        actorId: user._id,
        actorName: user.name,
        actorRole: user.role,
        createdAt: timestamp
      }));
    });
    await batch.commit();

    return settlement;
  },
  listSettlements: async (userId: string): Promise<PaymentSettlement[]> => {
    const user = currentUser();
    if (!canSettleExpenses(user) && userId !== user._id) throw new Error("You can only view your own settlements.");
    const base = companyCollection(user.companyId, "paymentSettlements");
    const snapshot = await getDocs(query(base, where("userId", "==", userId)));
    return snapshot.docs
      .map((doc) => ({ id: doc.id, _id: doc.id, ...doc.data() } as PaymentSettlement))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  allForReports: loadExpenses
};
