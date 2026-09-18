import { create } from 'zustand';
import { api, Cart } from '../lib/api';

type CartState = {
  cart: Cart | null;
  checkoutOpen: boolean;
  load: () => Promise<void>;
  add: (item: { variantId?: number; productId?: number }, quantity?: number) => Promise<void>;
  update: (itemId: number, quantity: number) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  setCheckoutOpen: (open: boolean) => void;
};

export const useCart = create<CartState>((set, get) => ({
  cart: null,
  checkoutOpen: false,
  load: async () => {
    const { data } = await api.get('/cart/');
    set({ cart: data });
  },
  add: async (item, quantity = 1) => {
    const payload: { variant_id?: number; product_id?: number; quantity: number } = { quantity };
    if (item.variantId) payload.variant_id = item.variantId;
    if (item.productId) payload.product_id = item.productId;
    if (!payload.variant_id && !payload.product_id) throw new Error('Produit indisponible');
    await api.post('/cart/add/', payload);
    await get().load();
  },
  update: async (itemId, quantity) => {
    const { data } = await api.patch('/cart/update_item/', { item_id: itemId, quantity });
    set({ cart: data });
  },
  remove: async (itemId) => {
    await api.delete('/cart/remove/', { data: { item_id: itemId } });
    await get().load();
  },
  applyCoupon: async (code) => {
    const { data } = await api.post('/cart/coupon/', { code });
    set({ cart: data });
  },
  setCheckoutOpen: (checkoutOpen) => set({ checkoutOpen }),
}));

