import { create } from "zustand";

type FilterState = {
  search: string;
  status: string;
  category: string;
  paymentMode: string;
  userId: string;
  setSearch: (search: string) => void;
  setStatus: (status: string) => void;
  setCategory: (category: string) => void;
  setPaymentMode: (paymentMode: string) => void;
  setUserId: (userId: string) => void;
  reset: () => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  search: "",
  status: "all",
  category: "all",
  paymentMode: "all",
  userId: "all",
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  setPaymentMode: (paymentMode) => set({ paymentMode }),
  setUserId: (userId) => set({ userId }),
  reset: () => set({ search: "", status: "all", category: "all", paymentMode: "all", userId: "all" })
}));
