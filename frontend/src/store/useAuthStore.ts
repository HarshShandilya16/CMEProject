import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  photo?: string;
  googleUser?: boolean;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token: string, user: AuthUser) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
);
