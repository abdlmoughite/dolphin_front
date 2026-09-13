import { create } from 'zustand';
import { AUTH_EXPIRED_EVENT, api, clearAuthTokens, getStoredAccessToken, getStoredRefreshToken, setAuthTokens, User } from '../lib/api';

type AuthState = {
  user: User | null;
  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  registerCustomer: (payload: { email: string; username: string; password: string; first_name?: string; last_name?: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  logoutLocal: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  boot: async () => {
    if (!getStoredAccessToken()) return;
    const { data } = await api.get('/auth/me/');
    set({ user: data });
  },
  login: async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    setAuthTokens(data.access, data.refresh);
    set({ user: data.user });
    return data.user;
  },
  registerCustomer: async (payload) => {
    const { data } = await api.post('/auth/register/', payload);
    setAuthTokens(data.access, data.refresh);
    set({ user: data.user });
    return data.user;
  },
  logout: async () => {
    const refresh = getStoredRefreshToken();
    if (refresh) await api.post('/auth/logout/', { refresh }).catch(() => undefined);
    clearAuthTokens();
    set({ user: null });
  },
  logoutLocal: () => {
    clearAuthTokens();
    set({ user: null });
  },
}));

window.addEventListener(AUTH_EXPIRED_EVENT, () => useAuth.getState().logoutLocal());
