import { create } from "zustand";

import type { Product } from "@/features/products/types";

export interface CartLine {
  productId: string;
  code: string;
  name: string;
  unitPrice: number;
  gstPercentage: number;
  hsnCode: string | null;
  quantity: number;
  discount: number;
}

interface CartState {
  lines: CartLine[];
  billDiscount: number;
  addProduct: (p: Product) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setDiscount: (productId: string, discount: number) => void;
  remove: (productId: string) => void;
  setBillDiscount: (value: number) => void;
  clear: () => void;
  load: (lines: CartLine[], billDiscount: number) => void;
}

/**
 * CR-7: cart store holds ONLY line items + bill discount. Payment/customer/GST-display
 * live in the checkout store, so updating payment never re-renders the cart and vice
 * versa. Actions are stable references — selector subscribers (e.g. the product grid that
 * only needs `addProduct`) don't re-render on line changes.
 */
export const useCart = create<CartState>((set) => ({
  lines: [],
  billDiscount: 0,

  addProduct: (p) =>
    set((state) => {
      const existing = state.lines.find((l) => l.productId === p.id);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            productId: p.id,
            code: p.product_code,
            name: p.name,
            unitPrice: p.selling_price,
            gstPercentage: p.gst_percentage,
            hsnCode: p.hsn_code,
            quantity: 1,
            discount: 0,
          },
        ],
      };
    }),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.productId === productId ? { ...l, quantity: Math.max(0, quantity) } : l,
      ),
    })),

  setDiscount: (productId, discount) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.productId === productId ? { ...l, discount: Math.max(0, discount) } : l,
      ),
    })),

  remove: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

  setBillDiscount: (value) => set({ billDiscount: Math.max(0, value) }),
  clear: () => set({ lines: [], billDiscount: 0 }),
  load: (lines, billDiscount) => set({ lines, billDiscount }),
}));
