import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
});

const API_BASE = api.defaults.baseURL || '';
const MEDIA_BASE = API_BASE.replace(/\/api\/v1\/?$/, '');

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dolphin_access');
  const session = localStorage.getItem('dolphin_session') || crypto.randomUUID();
  localStorage.setItem('dolphin_session', session);
  config.headers.Authorization = token ? `Bearer ${token}` : undefined;
  config.headers['X-Session-Key'] = session;
  return config;
});

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };
let refreshRequest: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    const request = error.config as RetryableRequest | undefined;
    const refresh = localStorage.getItem('dolphin_refresh');
    const isAuthRequest = request?.url?.includes('/auth/login/') || request?.url?.includes('/auth/refresh/');
    if (error.response?.status === 401 && request && refresh && !request._retry && !isAuthRequest) {
      request._retry = true;
      refreshRequest ||= axios
        .post<{ access: string }>(`${API_BASE}/auth/refresh/`, { refresh })
        .then(({ data }) => {
          localStorage.setItem('dolphin_access', data.access);
          return data.access;
        })
        .finally(() => { refreshRequest = null; });
      try {
        const access = await refreshRequest;
        request.headers.Authorization = `Bearer ${access}`;
        return api(request);
      } catch {
        localStorage.removeItem('dolphin_access');
        localStorage.removeItem('dolphin_refresh');
      }
    }
    const message = error.response?.data?.detail || 'Une erreur est survenue.';
    if (error.response?.status !== 401) toast.error(message);
    return Promise.reject(error);
  },
);

export type Paginated<T> = { count: number; results: T[] };
export type User = { id: number; email: string; username: string; first_name: string; last_name: string; role: string; status: string; phone?: string; avatar?: string | null };
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
export type WishlistItem = { id: number; product: Product; created_at: string };
export type CustomerNotification = { id: number; title: string; message: string; is_read: boolean; created_at: string };
export type CustomerAddress = { id: number; label: string; full_name: string; phone: string; address_line1: string; address_line2?: string; city: string; postal_code?: string; is_default: boolean };

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
