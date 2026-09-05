import { create } from 'zustand';
import { api, User } from '../lib/api';

type AuthState = {
  user: User | null;
  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { email: string; username: string; password: string; first_name: string; last_name: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  boot: async () => {
    if (!localStorage.getItem('dolphin_access')) return;
    try {
      const { data } = await api.get('/auth/me/');
      set({ user: data });
    } catch {
      localStorage.removeItem('dolphin_access');
      localStorage.removeItem('dolphin_refresh');
      set({ user: null });
    }
  },
  login: async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    localStorage.setItem('dolphin_access', data.access);
    localStorage.setItem('dolphin_refresh', data.refresh);
    set({ user: data.user });
    return data.user;
  },
  register: async (payload) => {
    const { data } = await api.post('/auth/register/', payload);
    localStorage.setItem('dolphin_access', data.access);
    localStorage.setItem('dolphin_refresh', data.refresh);
    set({ user: data.user });
    return data.user;
  },
  logout: async () => {
    const refresh = localStorage.getItem('dolphin_refresh');
    if (refresh) await api.post('/auth/logout/', { refresh }).catch(() => undefined);
    localStorage.removeItem('dolphin_access');
    localStorage.removeItem('dolphin_refresh');
    set({ user: null });
  },
}));
