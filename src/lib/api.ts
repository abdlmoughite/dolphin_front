import axios from 'axios';
import toast from 'react-hot-toast';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const normalizedRoot = rawBaseUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
const API_BASE_URL = `${normalizedRoot}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
});

const API_BASE = api.defaults.baseURL || '';
const MEDIA_BASE = API_BASE.replace(/\/api\/v1\/?$/, '');
let refreshPromise: Promise<string> | null = null;

export const AUTH_EXPIRED_EVENT = 'dolphin-auth-expired';

export function getStoredAccessToken() {
  return localStorage.getItem('dolphin_access');
}

export function getStoredRefreshToken() {
  return localStorage.getItem('dolphin_refresh');
}

export function setAuthTokens(access: string, refresh?: string) {
  localStorage.setItem('dolphin_access', access);
  if (refresh) localStorage.setItem('dolphin_refresh', refresh);
}

export function clearAuthTokens() {
  localStorage.removeItem('dolphin_access');
  localStorage.removeItem('dolphin_refresh');
}

function authExpired() {
  clearAuthTokens();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

async function refreshAccessToken() {
  const refresh = getStoredRefreshToken();
  if (!refresh) throw new Error('Missing refresh token');
  const { data } = await axios.post<{ access: string; refresh?: string }>(`${API_BASE_URL}/auth/refresh/`, { refresh });
  setAuthTokens(data.access, data.refresh);
  return data.access;
}

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  const session = localStorage.getItem('dolphin_session') || crypto.randomUUID();
  localStorage.setItem('dolphin_session', session);
  config.headers.Authorization = token ? `Bearer ${token}` : undefined;
  config.headers['X-Session-Key'] = session;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && getStoredRefreshToken()) {
      original._retry = true;
      try {
        refreshPromise ||= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const access = await refreshPromise;
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        authExpired();
        toast.error('Session expiree. Reconnectez-vous.');
      }
    }
    const message = error.response?.data?.detail || 'Une erreur est survenue.';
    if (error.response?.status !== 401) toast.error(error.response?.status === 403 ? 'Acces non autorise pour ce role.' : message);
    return Promise.reject(error);
  },
);

export type Paginated<T> = { count: number; results: T[] };
export type User = { id: number; email: string; first_name: string; last_name: string; role: string; status: string; phone?: string };
export type Category = { id: number; name: string; slug: string; description: string; image?: string | null; product_count?: number; parent?: number | null; display_order?: number; is_archived?: boolean };
export type Brand = { id: number; name: string; slug: string; logo?: string | null };
export type Variant = { id: number; sku: string; price: string; price_override?: string | null; inventory?: { quantity: number; available_quantity: number }; values: { id: number; value: string; color_hex?: string }[] };
export type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  short_description: string;
  description: string;
  regular_price: string;
  promotional_price?: string | null;
  low_stock_threshold: number;
  current_price: string;
  discount_percent: number;
  status: string;
  source_type: string;
  featured: boolean;
  new_arrival: boolean;
  bestseller: boolean;
  category: Category;
  brand?: Brand;
  variants: Variant[];
  images?: { id: number; image?: string; alt_text: string; is_main: boolean; display_order: number }[];
  average_rating?: number;
};
export type CartItem = { id: number; variant: Variant & { product?: Product }; quantity: number; line_total: string };
export type Cart = { id: number; items: CartItem[]; subtotal: string; discount_total: string; total: string };
export type Order = { id: number; order_number: string; status: string; total: string; created_at: string; items: unknown[]; status_history: { to_status: string; created_at: string; note: string }[] };
export type HomepageBanner = { id: number; title: string; subtitle: string; image?: string | null; cta_label: string; cta_url: string };

export function mediaUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${MEDIA_BASE}/${path.replace(/^\/+/, '')}`;
}

export async function downloadFile(path: string, filename: string) {
  const response = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
