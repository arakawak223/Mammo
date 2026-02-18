import { create } from 'zustand';

interface User {
  id: string;
  phone: string;
  name: string;
  role: 'elderly' | 'family_owner' | 'family_member';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken, refreshToken) =>
    set({ user, accessToken, refreshToken, isAuthenticated: true }),
  logout: () =>
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
}));
