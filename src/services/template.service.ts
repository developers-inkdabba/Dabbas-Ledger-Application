import { addDoc, deleteDoc, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { cleanRecord, companyCollection, nowIso } from "./firestore.utils";
import { db } from "./firebase";
import { useAuthStore } from "../store/auth.store";
import { ExpenseTemplate } from "../types";

const currentUser = () => {
  const user = useAuthStore.getState().user;
  if (!user?._id || !user.companyId) throw new Error("Please login again.");
  return user;
};

const mapTemplateDoc = (snapshot: { id: string; data: () => Record<string, unknown> }): ExpenseTemplate => {
  const data = snapshot.data() || {};
  return {
    _id: snapshot.id,
    name: String(data.name || ""),
    category: data.category as ExpenseTemplate["category"],
    paymentMode: data.paymentMode as ExpenseTemplate["paymentMode"],
    projectName: String(data.projectName || ""),
    clientName: String(data.clientName || ""),
    description: String(data.description || ""),
    amount: data.amount ? String(data.amount) : undefined,
    companyId: String(data.companyId || ""),
    userId: String(data.userId || ""),
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || "")
  };
};

export const templateService = {
  list: async (): Promise<ExpenseTemplate[]> => {
    const user = currentUser();
    const base = companyCollection(user.companyId, "expenseTemplates");
    const snapshot = await getDocs(query(base, where("userId", "==", user._id)));
    return snapshot.docs
      .map((d) => mapTemplateDoc({ id: d.id, data: () => d.data() as Record<string, unknown> }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  create: async (
    template: Omit<ExpenseTemplate, "_id" | "companyId" | "userId" | "createdAt" | "updatedAt">
  ): Promise<ExpenseTemplate> => {
    const user = currentUser();
    const timestamp = nowIso();
    const ref = await addDoc(
      companyCollection(user.companyId, "expenseTemplates"),
      cleanRecord({
        ...template,
        companyId: user.companyId,
        userId: user._id,
        createdAt: timestamp,
        updatedAt: timestamp
      } as Record<string, unknown>)
    );
    const snap = await getDoc(doc(db, ref.path));
    return mapTemplateDoc({ id: snap.id, data: () => snap.data() as Record<string, unknown> });
  },

  delete: async (id: string): Promise<void> => {
    const user = currentUser();
    await deleteDoc(doc(companyCollection(user.companyId, "expenseTemplates"), id));
  }
};
