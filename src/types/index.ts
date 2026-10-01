import { categories, paymentModes, statuses } from "../constants/theme";

export type Role = "admin" | "manager" | "employee";
export type ExpenseCategory = (typeof categories)[number];
export type PaymentMode = (typeof paymentModes)[number];
export type ExpenseStatus = (typeof statuses)[number];
export type SettlementStatus = "unpaid" | "partially_paid" | "paid";

export type User = {
  _id?: string;
  id?: string;
  authUid?: string;
  companyId: string;
  name: string;
  email: string;
  userCode: string;
  role: Role;
  department: string;
  phoneNumber?: string;
  isActive: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  requestedCompanyName?: string;
  companyInviteCode?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  delegateId?: string;
  delegateName?: string;
  delegateUntil?: string;
};

export type ExpenseTemplate = {
  _id: string;
  name: string;
  category: ExpenseCategory;
  paymentMode: PaymentMode;
  projectName: string;
  clientName: string;
  description: string;
  amount?: string;
  companyId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyInvite = {
  _id: string;
  code: string;
  companyId: string;
  companyName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Expense = {
  _id: string;
  userId: string | User;
  projectName: string;
  clientName: string;
  category: ExpenseCategory;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  settlementStatus: SettlementStatus;
  settlementIds?: string[];
  lastSettledAt?: string;
  date: string;
  paymentMode: PaymentMode;
  description: string;
  receiptUrl?: string;
  receiptPublicId?: string;
  receiptType?: string;
  status: ExpenseStatus;
  approvalLevel?: number;
  requiredApprovals?: number;
  approvedBy?: User;
  approvedByUserIds?: string[];
  rejectionReason?: string;
  adminNote?: string;
  approvedAt?: string;
  paidBy?: User;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentSettlementAllocation = {
  expenseId: string;
  expenseTitle: string;
  expenseAmount: number;
  allocatedAmount: number;
  previousPaidAmount: number;
  newPaidAmount: number;
  remainingAmount: number;
  settlementStatus: SettlementStatus;
};

export type PaymentSettlement = {
  id?: string;
  _id?: string;
  companyId: string;
  userId: string;
  userName?: string;
  receivedAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  paymentDate: string;
  paymentMode?: PaymentMode;
  referenceNote?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  allocations: PaymentSettlementAllocation[];
};

export type PaymentSettlementInput = {
  receivedAmount: string;
  paymentDate: string;
  paymentMode?: PaymentMode | "";
  referenceNote?: string;
  userId?: string;
  allocationMode?: "oldest_first" | "newest_first" | "highest_amount_first";
};

export type Project = {
  _id: string;
  projectName: string;
  clientName: string;
  budget: number;
  status: "active" | "completed" | "archived";
  isDeleted?: boolean;
  deletedAt?: string;
};

export type TeamMember = User;

export type PersonSpend = {
  userId: string;
  name: string;
  department: string;
  role: Role;
  isActive: boolean;
  count: number;
  total: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  lastExpenseAt: string;
};

export type DashboardBreakdown = {
  label: string;
  count: number;
  total: number;
};

export type AuditLog = {
  _id: string;
  action: string;
  target: { type: string; id?: string; label?: string };
  metadata?: Record<string, unknown>;
  actorId: string;
  actorName?: string;
  actorRole?: Role;
  createdAt: string;
};

export type UploadResult = {
  url: string;
  publicId: string;
  type: string;
};

export type ReportMetric = {
  _id: string;
  count: number;
  total: number;
};

export type PagedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type ExpenseForm = {
  amount: string;
  date: string;
  category: ExpenseCategory;
  projectName: string;
  clientName: string;
  paymentMode: PaymentMode;
  description: string;
  receiptUrl?: string;
  receiptPublicId?: string;
  receiptType?: string;
};
