import axios from 'axios';
import toast from 'react-hot-toast';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};
const rawBaseUrl = viteEnv.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
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

export function apiErrorMessage(data: unknown) {
  if (!data || typeof data !== 'object') return 'Une erreur est survenue.';
  const payload = data as Record<string, unknown>;
  const first = payload.detail || payload.product_id || payload.variant_id || payload.quantity || payload.non_field_errors || Object.values(payload)[0];
  if (Array.isArray(first)) return String(first[0] || 'Une erreur est survenue.');
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') return apiErrorMessage(first);
  return 'Une erreur est survenue.';
}

export function readApiError(error: unknown) {
  const response = (error as { response?: { data?: unknown } }).response;
  return apiErrorMessage(response?.data);
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
    const message = apiErrorMessage(error.response?.data);
    if (error.response?.status !== 401) toast.error(error.response?.status === 403 ? 'Acces non autorise pour ce role.' : message);
    return Promise.reject(error);
  },
);

export type Paginated<T> = { count: number; results: T[] };
export type User = { id: number; email: string; first_name: string; last_name: string; role: string; status: string; phone?: string; page_permissions?: string[] };
export type Category = { id: number; name: string; slug: string; description: string; image?: string | null; product_count?: number; parent?: number | null; display_order?: number; is_active?: boolean; is_archived?: boolean };
export type Brand = { id: number; name: string; slug: string; logo?: string | null; is_active?: boolean };
export type Variant = { id: number; sku: string; price: string; price_override?: string | null; values: { id: number; value: string; color_hex?: string }[] };
export type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  short_description: string;
  description: string;
  regular_price: string;
  promotional_price?: string | null;
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
  created_at?: string;
};
export type CartItem = { id: number; product?: Product; variant?: Variant & { product?: Product }; product_name?: string; product_slug?: string; quantity: number; line_total: string };
export type Cart = { id: number; items: CartItem[]; subtotal: string; discount_total: string; total: string };
export type OrderItem = { id: number; product: number; variant: number; product_name: string; variant_label: string; sku: string; unit_price: string; quantity: number; total: string };
export type Order = { id: number; order_number: string; status: string; total: string; subtotal?: string; discount_total?: string; shipping_total?: string; payment_method?: string; shipping_full_name?: string; shipping_phone?: string; shipping_address?: string; shipping_city?: string; idempotency_key?: string | null; created_at: string; items: OrderItem[]; status_history: { to_status: string; created_at: string; note: string }[] };
export type ReturnRequest = { id: number; order: number; reason: string; status: string; admin_decision?: string; created_at: string; items: { id: number; order_item: number; product_name: string; sku: string; ordered_quantity: number; quantity: number }[]; history: { id: number; from_status: string; to_status: string; note: string; actor_email?: string; created_at: string }[] };
export type HomepageBanner = { id: number; title: string; subtitle: string; image?: string | null; cta_label: string; cta_url: string };
export type HomeSection = { id: number; key: string; title: string; description: string; is_visible: boolean; display_order: number; products: Product[] };
export type HomeDesignSettings = {
  store_name: string;
  announcement_text: string;
  announcement_bg_color: string;
  announcement_text_color: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  primary_cta_label: string;
  primary_cta_url: string;
  secondary_cta_label: string;
  secondary_cta_url: string;
  trust_1: string;
  trust_2: string;
  trust_3: string;
  service_1_title: string;
  service_1_text: string;
  service_2_title: string;
  service_2_text: string;
  service_3_title: string;
  service_3_text: string;
  newsletter_title: string;
  newsletter_subtitle: string;
  primary_color: string;
  accent_color: string;
};

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
