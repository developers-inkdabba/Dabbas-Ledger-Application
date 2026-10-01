import { addDoc } from "firebase/firestore";
import { companyCollection, cleanRecord } from "./firestore.utils";
import { useAuthStore } from "../store/auth.store";

export type AuditAction =
  | "expense.created"
  | "expense.approved"
  | "expense.rejected"
  | "expense.paid"
  | "expense.settlement_created"
  | "expense.partial_payment_applied"
  | "expense.full_payment_completed"
  | "user.created"
  | "user.deactivated"
  | "user.updated"
  | "user.access_approved"
  | "user.access_rejected"
  | "user.delegate_set"
  | "user.delegate_removed"
  | "company.invite_created"
  | "project.created"
  | "project.updated"
  | "project.deleted";

export const auditService = {
  record: async (action: AuditAction, target: { type: string; id?: string; label?: string }, metadata: Record<string, unknown> = {}) => {
    const user = useAuthStore.getState().user;
    if (!user?.companyId) return;
    await addDoc(companyCollection(user.companyId, "auditLogs"), cleanRecord({
      action,
      target,
      metadata,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      createdAt: new Date().toISOString()
    }));
  }
};
