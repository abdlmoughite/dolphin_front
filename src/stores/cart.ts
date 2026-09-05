import { create } from 'zustand';
import { api, Cart } from '../lib/api';

type CartState = {
  cart: Cart | null;
  load: () => Promise<void>;
  add: (variantId: number, quantity?: number) => Promise<void>;
  update: (itemId: number, quantity: number) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
};

export const useCart = create<CartState>((set, get) => ({
  cart: null,
  load: async () => {
    const { data } = await api.get('/cart/');
    set({ cart: data });
  },
  add: async (variantId, quantity = 1) => {
    await api.post('/cart/add/', { variant_id: variantId, quantity });
    await get().load();
  },
  update: async (itemId, quantity) => {
    await api.patch('/cart/update_item/', { item_id: itemId, quantity });
    await get().load();
  },
  remove: async (itemId) => {
    await api.delete('/cart/remove/', { data: { item_id: itemId } });
    await get().load();
  },
  applyCoupon: async (code) => {
    const { data } = await api.post('/cart/coupon/', { code });
    set({ cart: data });
  },
}));
