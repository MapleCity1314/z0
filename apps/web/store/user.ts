import { create } from "zustand";

// Public user info (excludes sensitive fields like password)
export interface PublicUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

interface UserStore {
  user: PublicUser | null;
  setUser: (user: PublicUser | null) => void;
  updateUser: (updates: Partial<PublicUser>) => void;
}

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
