import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role?: 'admin' | 'user' | 'banned';
}

interface AuthStore {
  user: User | null;
  userToken: string | null;
  refreshToken: string | null;
  register: (name: string, email: string, password: string) => Promise<string | true>;
  login: (email: string, password: string) => Promise<string | true>;
  logout: () => void;
  refreshJwt: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  userToken: null,
  refreshToken: null,
  register: async (name, email, password) => {
    try {
      const res = await fetch('http://localhost:4000/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Erreur lors de l'inscription";
      set({
        user: { id: data.id, name: data.name, email: data.email, role: data.role },
        userToken: data.token || null,
        refreshToken: data.refreshToken || null
      });
      return true;
    } catch (e) {
      return "Erreur réseau";
    }
  },
  login: async (email, password) => {
    try {
      const res = await fetch('http://localhost:4000/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return data.error || "Erreur lors de la connexion";
      }
      set({
        user: { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role },
        userToken: data.token || null,
        refreshToken: data.refreshToken || null
      });
      return true;
    } catch (e) {
      return "Erreur réseau";
    }
  },
  logout: () => {
    set({ user: null, userToken: null, refreshToken: null });
  },
  refreshJwt: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return false;
    try {
      const res = await fetch('http://localhost:4000/users/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      const data = await res.json();
      if (!res.ok || !data.token) return false;
      set({ userToken: data.token });
      return true;
    } catch {
      return false;
    }
  }
}));