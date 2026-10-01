import { create } from "zustand";
import { authService } from "../services/auth.service";
import { auth } from "../services/firebase";
import { User } from "../types";

type AuthState = {
  token: string | null;
  user: User | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  setSession: (token: string, user: User) => Promise<void>;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isBootstrapping: true,
  isAuthenticated: false,
  setSession: async (token, user) => {
    set({ token, user, isAuthenticated: true });
  },
  bootstrap: async () => {
    try {
      const user = await authService.me();
      set({ token: auth.currentUser?.uid || user.authUid || user._id || null, user, isAuthenticated: true, isBootstrapping: false });
    } catch {
      set({ token: null, user: null, isAuthenticated: false, isBootstrapping: false });
    }
  },
  logout: async () => {
    await authService.logout();
    set({ token: null, user: null, isAuthenticated: false });
  }
}));

export const getToken = () => useAuthStore.getState().token;
