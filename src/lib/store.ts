import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string | number;
  username?: string;
  nickname: string;
  full_name?: string;
  email?: string;
  role: string;
  avatar?: string;
  elo?: number;
  is_premium?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null as User | null,
      token: null as string | null,
      isAuthenticated: false,
      setAuth: (user: User, token: string) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
