import { create } from 'zustand';
import { AUTH_EXPIRED_EVENT, api, clearAuthTokens, getStoredAccessToken, getStoredRefreshToken, setAuthTokens, User } from '../lib/api';

type AuthState = {
  user: User | null;
  booted: boolean;
  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  registerCustomer: (payload: { email: string; username: string; password: string; first_name?: string; last_name?: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  logoutLocal: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  booted: false,
  boot: async () => {
    if (!getStoredAccessToken()) {
      set({ user: null, booted: true });
      return;
    }
    try {
      const { data } = await api.get('/auth/me/');
      set({ user: data, booted: true });
    } catch {
      clearAuthTokens();
      set({ user: null, booted: true });
    }
  },
  login: async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    setAuthTokens(data.access, data.refresh);
    set({ user: data.user, booted: true });
    return data.user;
  },
  registerCustomer: async (payload) => {
    const { data } = await api.post('/auth/register/', payload);
    setAuthTokens(data.access, data.refresh);
    set({ user: data.user, booted: true });
    return data.user;
  },
  logout: async () => {
    const refresh = getStoredRefreshToken();
    if (refresh) await api.post('/auth/logout/', { refresh }).catch(() => undefined);
    clearAuthTokens();
    set({ user: null, booted: true });
  },
  logoutLocal: () => {
    clearAuthTokens();
    set({ user: null, booted: true });
  },
}));

window.addEventListener(AUTH_EXPIRED_EVENT, () => useAuth.getState().logoutLocal());
