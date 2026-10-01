import { createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { auditService } from "./audit.service";
import { expenseService } from "./expense.service";
import { provisioningAuth } from "./firebase";
import { db } from "./firebase";
import {
  canApproveExpenses,
  canApprovePeople,
  canManagePeople,
  cleanRecord,
  collections,
  companyCollection,
  companyDoc,
  companyInviteDoc,
  mapCompanyInviteDoc,
  mapProjectDoc,
  mapUserDoc,
  normalizeCompanyCode,
  normalizeEmail,
  normalizeUserCode,
  nowIso
} from "./firestore.utils";
import { useAuthStore } from "../store/auth.store";
import { Expense, PersonSpend, Project, User } from "../types";

const ensureAdmin = () => {
  const user = useAuthStore.getState().user;
  if (!canManagePeople(user)) throw new Error("Admin access required.");
  if (!user?.companyId) throw new Error("Please login again.");
  return user;
};

const ensureWorkspaceReviewer = () => {
  const user = useAuthStore.getState().user;
  if (!canApproveExpenses(user)) throw new Error("Manager or admin access required.");
  if (!user?.companyId) throw new Error("Please login again.");
  return user;
};

const ensurePeopleReviewer = () => {
  const user = useAuthStore.getState().user;
  if (!canApprovePeople(user)) throw new Error("Manager or admin access required.");
  if (!user?.companyId) throw new Error("Please login again.");
  return user;
};

const userRef = (companyId: string, id: string) => doc(companyDoc(companyId), collections.users, id);
const projectRef = (companyId: string, id: string) => doc(companyDoc(companyId), collections.projects, id);
const companyInvitesRef = () => collection(db, collections.companyInvites);
const loadTeam = async (companyId: string) => {
  const snapshot = await getDocs(companyCollection(companyId, "users"));
  return snapshot.docs.map(mapUserDoc).sort((a, b) => a.name.localeCompare(b.name));
};

const inviteAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newInviteCode = () =>
  Array.from({ length: 8 }, () => inviteAlphabet[Math.floor(Math.random() * inviteAlphabet.length)]).join("");

const totalsFromExpenses = (expenses: Expense[]) =>
  expenses.reduce<Record<string, { count: number; total: number }>>(
    (acc, item) => {
      if (!acc[item.status]) acc[item.status] = { count: 0, total: 0 };
      acc[item.status].count += 1;
      acc[item.status].total += item.amount;
      return acc;
    },
    {
      pending_manager: { count: 0, total: 0 },
      approved: { count: 0, total: 0 },
      paid: { count: 0, total: 0 },
      rejected: { count: 0, total: 0 }
    }
  );

const paidAmountFrom = (expenses: Expense[]) =>
  expenses
    .filter((expense) => expense.status === "approved" || expense.status === "paid")
    .reduce((sum, expense) => sum + Math.min(expense.amount, Math.max(0, expense.paidAmount || 0)), 0);

const ownerIdOf = (expense: Expense) => (typeof expense.userId === "object" ? expense.userId._id || expense.userId.id || expense.userId.authUid || "" : expense.userId);
const ownerOf = (expense: Expense) => (typeof expense.userId === "object" ? expense.userId : undefined);
const userIds = (user: User) => [user._id, user.id, user.authUid].filter(Boolean) as string[];

const personBreakdownFrom = (expenses: Expense[], team: User[]) => {
  const lookup = new Map<string, User>();
  team.forEach((user) => userIds(user).forEach((id) => lookup.set(id, user)));

  const people = new Map<string, PersonSpend>();

  team.forEach((user) => {
    const id = user._id || user.id || user.authUid || user.userCode;
    people.set(id, {
      userId: id,
      name: user.name || user.email || "Team member",
      department: user.department || "General",
      role: user.role,
      isActive: user.isActive,
      count: 0,
      total: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      lastExpenseAt: ""
    });
  });

  expenses.forEach((expense) => {
    const ownerId = ownerIdOf(expense);
    const owner = lookup.get(ownerId) || ownerOf(expense);
    const id = ownerId || owner?._id || owner?.id || owner?.authUid || "unassigned";
    const current = people.get(id) || {
      userId: id,
      name: owner?.name || "Unassigned",
      department: owner?.department || "Unknown",
      role: owner?.role || "employee",
      isActive: owner?.isActive !== false,
      count: 0,
      total: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      lastExpenseAt: ""
    };

    current.count += 1;
    current.total += expense.amount;
    if (expense.status === "pending_manager") current.pending += expense.amount;
    if (expense.status === "approved") current.approved += expense.remainingAmount;
    if (expense.status === "approved" || expense.status === "paid") current.paid += Math.min(expense.amount, Math.max(0, expense.paidAmount || 0));
    if (expense.status === "rejected") current.rejected += expense.amount;
    current.lastExpenseAt = [current.lastExpenseAt, expense.createdAt || expense.date].sort().slice(-1)[0] || "";
    people.set(id, current);
  });

  return Array.from(people.values()).sort((a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name));
};

const categoryBreakdownFrom = (expenses: Expense[]) =>
  Array.from(
    expenses.reduce<Map<string, { label: string; count: number; total: number }>>((acc, expense) => {
      const current = acc.get(expense.category) || { label: expense.category, count: 0, total: 0 };
      current.count += 1;
      current.total += expense.amount;
      acc.set(expense.category, current);
      return acc;
    }, new Map()).values()
  ).sort((a, b) => b.total - a.total);

const monthBreakdownFrom = (expenses: Expense[]) => {
  const formatter = new Intl.DateTimeFormat("en-IN", { month: "short" });
  const buckets = new Map<string, { label: string; count: number; total: number; sortKey: string }>();
  expenses.forEach((expense) => {
    const date = new Date(expense.date || expense.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const current = buckets.get(sortKey) || { label: formatter.format(date), count: 0, total: 0, sortKey };
    current.count += 1;
    current.total += expense.amount;
    buckets.set(sortKey, current);
  });

  return Array.from(buckets.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(-6);
};

const balanceDueFrom = (expenses: Expense[]) =>
  expenses
    .filter((expense) => expense.status === "approved" && expense.remainingAmount > 0)
    .reduce((sum, expense) => sum + expense.remainingAmount, 0);

export const adminService = {
  dashboard: async () => {
    const reviewer = ensureWorkspaceReviewer();
    const [expenses, team] = await Promise.all([expenseService.allForReports(), loadTeam(reviewer.companyId)]);
    const recentPending = expenses.filter((expense) => expense.status === "pending_manager").slice(0, 6);
    return {
      totals: totalsFromExpenses(expenses),
      totalSpend: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      paidAmount: paidAmountFrom(expenses),
      totalTeam: team.length,
      totalExpenses: expenses.length,
      balanceDue: balanceDueFrom(expenses),
      recentPending,
      people: personBreakdownFrom(expenses, team),
      categories: categoryBreakdownFrom(expenses),
      months: monthBreakdownFrom(expenses)
    };
  },
  team: async () => {
    const admin = ensureAdmin();
    return loadTeam(admin.companyId);
  },
  accessRequests: async () => {
    const reviewer = ensurePeopleReviewer();
    const team = await loadTeam(reviewer.companyId);
    return team
      .filter((user) => user.approvalStatus === "pending")
      .sort((a, b) => (b.authUid || b._id || "").localeCompare(a.authUid || a._id || ""));
  },
  companyInvites: async () => {
    const admin = ensureAdmin();
    const snapshot = await getDocs(query(companyInvitesRef(), where("companyId", "==", admin.companyId)));
    return snapshot.docs
      .map(mapCompanyInviteDoc)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  generateCompanyInvite: async () => {
    const admin = ensureAdmin();
    const companySnapshot = await getDoc(companyDoc(admin.companyId));
    const companyData = companySnapshot.data() || {};
    const companyName = String(companyData.name || companyData.companyName || "Dabba's Ledger Workspace");
    let code = "";
    let attempts = 0;

    do {
      const candidate = normalizeCompanyCode(newInviteCode());
      attempts += 1;
      if (!(await getDoc(companyInviteDoc(candidate))).exists()) {
        code = candidate;
        break;
      }
    } while (attempts < 8);

    if (!code) throw new Error("Could not generate a unique company code. Please try again.");

    const timestamp = nowIso();
    await setDoc(companyInviteDoc(code), {
      code,
      companyId: admin.companyId,
      companyName,
      isActive: true,
      createdBy: admin._id || admin.authUid,
      createdByName: admin.name,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    await auditService.record("company.invite_created", { type: "companyInvite", id: code, label: companyName }, { code });
    const snapshot = await getDoc(companyInviteDoc(code));
    return mapCompanyInviteDoc(snapshot);
  },
  approveAccess: async (id: string) => {
    const reviewer = ensurePeopleReviewer();
    const ref = userRef(reviewer.companyId, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error("Access request not found.");
    const target = mapUserDoc(snapshot);
    const timestamp = nowIso();

    await updateDoc(ref, cleanRecord({
      isActive: true,
      approvalStatus: "approved",
      department: target.department === "Pending approval" ? "General" : target.department,
      approvedAt: timestamp,
      approvedBy: reviewer._id || reviewer.authUid,
      approvedByName: reviewer.name,
      updatedAt: timestamp
    }));
    await setDoc(doc(db, collections.userProfiles, id), {
      companyId: reviewer.companyId,
      role: "employee",
      isActive: true,
      approvalStatus: "approved",
      updatedAt: timestamp
    }, { merge: true });
    await auditService.record("user.access_approved", { type: "user", id, label: target.name }, { reviewer: reviewer.name });

    const updated = await getDoc(ref);
    return mapUserDoc(updated);
  },
  rejectAccess: async (id: string, reason = "Workspace access was not approved.") => {
    const reviewer = ensurePeopleReviewer();
    const ref = userRef(reviewer.companyId, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) throw new Error("Access request not found.");
    const target = mapUserDoc(snapshot);
    const timestamp = nowIso();

    await updateDoc(ref, cleanRecord({
      isActive: false,
      approvalStatus: "rejected",
      rejectionReason: reason,
      rejectedAt: timestamp,
      rejectedBy: reviewer._id || reviewer.authUid,
      rejectedByName: reviewer.name,
      updatedAt: timestamp
    }));
    await setDoc(doc(db, collections.userProfiles, id), {
      companyId: reviewer.companyId,
      role: "employee",
      isActive: false,
      approvalStatus: "rejected",
      updatedAt: timestamp
    }, { merge: true });
    await auditService.record("user.access_rejected", { type: "user", id, label: target.name }, { reviewer: reviewer.name });

    const updated = await getDoc(ref);
    return mapUserDoc(updated);
  },
  createUser: async (payload: Partial<User> & { pin?: string; password?: string }) => {
    const admin = ensureAdmin();
    const email = normalizeEmail(payload.email || payload.userCode || "");
    const password = payload.password || payload.pin || "";
    if (!email || !/^\d{6}$/.test(password)) throw new Error("Email and a 6-digit PIN are required.");

    const credential = await createUserWithEmailAndPassword(provisioningAuth, email, password);
    if (payload.name) await updateProfile(credential.user, { displayName: payload.name.trim() });

    const timestamp = nowIso();
    const profileRef = userRef(admin.companyId, credential.user.uid);
    await setDoc(profileRef, cleanRecord({
      name: payload.name?.trim(),
      email,
      userCode: normalizeUserCode(payload.userCode || email),
      authUid: credential.user.uid,
      companyId: admin.companyId,
      role: payload.role || "employee",
      department: payload.department?.trim(),
      phoneNumber: payload.phoneNumber?.trim(),
      isActive: payload.isActive !== false,
      approvalStatus: "approved",
      createdAt: timestamp,
      updatedAt: timestamp
    }));
    await setDoc(doc(db, collections.userProfiles, credential.user.uid), {
      companyId: admin.companyId,
      role: payload.role || "employee",
      isActive: payload.isActive !== false,
      approvalStatus: "approved",
      updatedAt: timestamp
    });
    await signOut(provisioningAuth);
    await auditService.record("user.created", { type: "user", id: credential.user.uid, label: payload.name }, { role: payload.role || "employee" });

    const snapshot = await getDoc(profileRef);
    return mapUserDoc(snapshot);
  },
  updateUser: async (id: string, payload: Partial<User>) => {
    const admin = ensureAdmin();
    const before = await getDoc(userRef(admin.companyId, id));
    await updateDoc(userRef(admin.companyId, id), cleanRecord({
      ...payload,
      email: payload.email ? normalizeEmail(payload.email) : undefined,
      userCode: payload.userCode ? normalizeUserCode(payload.userCode) : undefined,
      updatedAt: nowIso()
    }));
    await updateDoc(doc(db, collections.userProfiles, id), cleanRecord({
      role: payload.role,
      isActive: payload.isActive,
      updatedAt: nowIso()
    })).catch(() => undefined);
    const snapshot = await getDoc(userRef(admin.companyId, id));
    if (!snapshot.exists()) throw new Error("User not found after update.");
    await auditService.record(payload.isActive === false ? "user.deactivated" : "user.updated", { type: "user", id, label: mapUserDoc(snapshot).name }, {
      beforeActive: before.exists() ? mapUserDoc(before).isActive : undefined,
      afterActive: payload.isActive
    });
    return mapUserDoc(snapshot);
  },
  deleteUser: async (id: string) => {
    await adminService.updateUser(id, { isActive: false });
    return { message: "User deactivated." };
  },
  activity: async () => {
    const admin = ensureAdmin();
    const snapshot = await getDocs(companyCollection(admin.companyId, "auditLogs"));
    return snapshot.docs.map((item) => ({ _id: item.id, ...item.data() }));
  },
  projects: async () => {
    const admin = ensureAdmin();
    const snapshot = await getDocs(companyCollection(admin.companyId, "projects"));
    return snapshot.docs
      .map(mapProjectDoc)
      .filter((project) => !project.isDeleted)
      .sort((a, b) => a.projectName.localeCompare(b.projectName));
  },
  createProject: async (payload: Omit<Project, "_id">) => {
    const admin = ensureAdmin();
    const timestamp = nowIso();
    const ref = await addDoc(companyCollection(admin.companyId, "projects"), cleanRecord({
      ...payload,
      budget: Number(payload.budget || 0),
      status: payload.status || "active",
      createdAt: timestamp,
      updatedAt: timestamp
    }));
    await auditService.record("project.created", { type: "project", id: ref.id, label: payload.projectName }, { budget: Number(payload.budget || 0) });
    const snapshot = await getDoc(ref);
    return mapProjectDoc(snapshot);
  },
  updateProject: async (id: string, payload: Partial<Project>) => {
    const admin = ensureAdmin();
    await updateDoc(projectRef(admin.companyId, id), cleanRecord({ ...payload, updatedAt: nowIso() }));
    await auditService.record("project.updated", { type: "project", id, label: payload.projectName }, payload as Record<string, unknown>);
    const snapshot = await getDoc(projectRef(admin.companyId, id));
    if (!snapshot.exists()) throw new Error("Project not found after update.");
    return mapProjectDoc(snapshot);
  },
  deleteProject: async (id: string) => {
    const admin = ensureAdmin();
    const snapshot = await getDoc(projectRef(admin.companyId, id));
    if (!snapshot.exists()) throw new Error("Project not found.");
    const project = mapProjectDoc(snapshot);
    await updateDoc(projectRef(admin.companyId, id), {
      status: "archived",
      isDeleted: true,
      deletedAt: nowIso(),
      updatedAt: nowIso()
    });
    await auditService.record("project.deleted", { type: "project", id, label: project.projectName }, { budget: project.budget });
    return { message: "Project deleted." };
  },

  // --- Approval Delegation -------------------------------------------------

  setDelegate: async (managerId: string, delegateId: string, delegateUntil?: string) => {
    const admin = ensureAdmin();
    const managerSnap = await getDoc(userRef(admin.companyId, managerId));
    if (!managerSnap.exists()) throw new Error("Manager not found.");
    const manager = mapUserDoc(managerSnap);

    const delegateSnap = await getDoc(userRef(admin.companyId, delegateId));
    if (!delegateSnap.exists()) throw new Error("Delegate user not found.");
    const delegate = mapUserDoc(delegateSnap);
    if (delegate.role === "employee") throw new Error("Delegate must be a manager or admin.");

    await updateDoc(userRef(admin.companyId, managerId), cleanRecord({
      delegateId,
      delegateName: delegate.name,
      delegateUntil: delegateUntil || undefined,
      updatedAt: nowIso()
    }));
    await auditService.record(
      "user.delegate_set",
      { type: "user", id: managerId, label: manager.name },
      { delegateId, delegateName: delegate.name, delegateUntil }
    );
    const updated = await getDoc(userRef(admin.companyId, managerId));
    return mapUserDoc(updated);
  },

  removeDelegate: async (managerId: string) => {
    const admin = ensureAdmin();
    const snap = await getDoc(userRef(admin.companyId, managerId));
    if (!snap.exists()) throw new Error("Manager not found.");
    const manager = mapUserDoc(snap);
    await updateDoc(userRef(admin.companyId, managerId), {
      delegateId: null,
      delegateName: null,
      delegateUntil: null,
      updatedAt: nowIso()
    });
    await auditService.record(
      "user.delegate_removed",
      { type: "user", id: managerId, label: manager.name },
      {}
    );
    const updated = await getDoc(userRef(admin.companyId, managerId));
    return mapUserDoc(updated);
  }
};
