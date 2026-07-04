import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (productId, quantity = 1) => {
        const existing = get().items.find((item) => item.productId === productId);
        if (existing) {
          set({
            items: get().items.map((item) =>
              item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
            ),
          });
        } else {
          set({ items: [...get().items, { productId, quantity }] });
        }
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((item) => item.productId !== productId) });
          return;
        }
        set({ items: get().items.map((item) => (item.productId === productId ? { ...item, quantity } : item)) });
      },
      removeItem: (productId) => set({ items: get().items.filter((item) => item.productId !== productId) }),
      clear: () => set({ items: [] }),
    }),
    { name: 'electromart-cart' },
  ),
);
