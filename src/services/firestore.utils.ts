import {
  collection,
  doc,
  DocumentData,
  DocumentSnapshot,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { CompanyInvite, Expense, ExpenseCategory, ExpenseStatus, PaymentMode, Project, Role, SettlementStatus, User } from "../types";
import { toAmount } from "../utils/formatters";

export const collections = {
  companies: "companies",
  companyInvites: "companyInvites",
  userProfiles: "userProfiles",
  users: "users",
  expenses: "expenses",
  paymentSettlements: "paymentSettlements",
  projects: "projects",
  auditLogs: "auditLogs",
  settings: "settings",
  expenseTemplates: "expenseTemplates"
} as const;

export const nowIso = () => new Date().toISOString();

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeUserCode = (value: string) => value.trim().toUpperCase();
export const normalizeCompanyCode = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && Object.prototype.toString.call(value) === "[object Object]";

const cleanValue = (value: unknown): unknown => {
  if (value === undefined || value === "") return undefined;
  if (Array.isArray(value)) return value.map(cleanValue).filter((item) => item !== undefined);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, cleanValue(item)] as const)
      .filter(([, item]) => item !== undefined)
  );
};

export const cleanRecord = <T extends Record<string, unknown>>(record: T) => cleanValue(record) as Partial<T>;

export const toIso = (value: unknown) => {
  if (!value) return "";
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

export const docId = (value?: { _id?: string; id?: string }) => value?._id || value?.id || "";

export const companyDoc = (companyId: string) => doc(db, collections.companies, companyId);
export const companyInviteDoc = (code: string) => doc(db, collections.companyInvites, normalizeCompanyCode(code));
export const companyCollection = (companyId: string, name: "users" | "expenses" | "paymentSettlements" | "projects" | "auditLogs" | "settings" | "expenseTemplates") =>
  collection(db, collections.companies, companyId, collections[name]);

type AnySnapshot = DocumentSnapshot<DocumentData>;

const roleFrom = (value: unknown): Role => {
  if (value === "admin" || value === "manager" || value === "employee") return value;
  if (value === "member") return "employee";
  return "employee";
};

export const canManagePeople = (user?: User | null) => user?.role === "admin";
export const canApprovePeople = (user?: User | null) => user?.role === "admin" || user?.role === "manager";
export const canApproveExpenses = (user?: User | null) => user?.role === "admin" || user?.role === "manager";
export const canPayExpenses = (user?: User | null) => user?.role === "admin";
export const canSettleExpenses = (user?: User | null) => user?.role === "admin" || user?.role === "manager";

export const mapUserDoc = (snapshot: AnySnapshot): User => {
  const data = snapshot.data() || {};
  const email = String(data.email || data.userCode || "");
  return {
    _id: snapshot.id,
    id: snapshot.id,
    authUid: String(data.authUid || snapshot.id),
    companyId: String(data.companyId || snapshot.ref.parent.parent?.id || ""),
    name: String(data.name || ""),
    email,
    userCode: String(data.userCode || email).toUpperCase(),
    role: roleFrom(data.role),
    department: String(data.department || ""),
    phoneNumber: data.phoneNumber ? String(data.phoneNumber) : undefined,
    isActive: data.isActive !== false,
    approvalStatus: data.approvalStatus,
    requestedCompanyName: data.requestedCompanyName ? String(data.requestedCompanyName) : undefined,
    companyInviteCode: data.companyInviteCode ? String(data.companyInviteCode) : undefined,
    approvedAt: toIso(data.approvedAt),
    rejectedAt: toIso(data.rejectedAt),
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined
  };
};

export const mapCompanyInviteDoc = (snapshot: AnySnapshot): CompanyInvite => {
  const data = snapshot.data() || {};
  return {
    _id: snapshot.id,
    code: String(data.code || snapshot.id),
    companyId: String(data.companyId || ""),
    companyName: String(data.companyName || "Company workspace"),
    isActive: data.isActive !== false,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt)
  };
};

export const mapProjectDoc = (snapshot: AnySnapshot): Project => {
  const data = snapshot.data() || {};
  return {
    _id: snapshot.id,
    projectName: String(data.projectName || ""),
    clientName: String(data.clientName || ""),
    budget: Number(data.budget || 0),
    status: ["active", "completed", "archived"].includes(String(data.status)) ? data.status : "active",
    isDeleted: data.isDeleted === true,
    deletedAt: toIso(data.deletedAt)
  };
};

export const mapExpenseDoc = (snapshot: AnySnapshot): Expense => {
  const data = snapshot.data() || {};
  const amount = toAmount(data.amount);
  const paidAmount = data.paidAmount === undefined
    ? String(data.status || "") === "paid" ? amount : 0
    : Math.min(amount, Math.max(0, toAmount(data.paidAmount)));
  const remainingAmount = Math.max(0, amount - paidAmount);
  const settlementStatus = (data.settlementStatus === "partially_paid" || data.settlementStatus === "paid" || data.settlementStatus === "unpaid"
    ? data.settlementStatus
    : remainingAmount <= 0 || String(data.status || "") === "paid"
      ? "paid"
      : paidAmount > 0
        ? "partially_paid"
        : "unpaid") as SettlementStatus;

  return {
    _id: snapshot.id,
    userId: data.user || String(data.userId || ""),
    projectName: String(data.projectName || ""),
    clientName: String(data.clientName || ""),
    category: data.category as ExpenseCategory,
    amount,
    paidAmount,
    remainingAmount,
    settlementStatus,
    settlementIds: Array.isArray(data.settlementIds) ? data.settlementIds.map(String) : [],
    lastSettledAt: toIso(data.lastSettledAt),
    date: String(data.date || ""),
    paymentMode: data.paymentMode as PaymentMode,
    description: String(data.description || ""),
    receiptUrl: data.receiptUrl,
    receiptPublicId: data.receiptPublicId,
    receiptType: data.receiptType,
    status: (data.status || "pending_manager") as ExpenseStatus,
    approvalLevel: Number(data.approvalLevel || 0),
    requiredApprovals: Number(data.requiredApprovals || 1),
    approvedBy: data.approvedByUser,
    approvedByUserIds: Array.isArray(data.approvedByUserIds) ? data.approvedByUserIds : [],
    rejectionReason: data.rejectionReason,
    adminNote: data.adminNote,
    approvedAt: toIso(data.approvedAt),
    paidBy: data.paidByUser,
    paidAt: toIso(data.paidAt),
    createdAt: toIso(data.createdAt) || nowIso(),
    updatedAt: toIso(data.updatedAt) || nowIso()
  };
};

export const timestampFields = {
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};
