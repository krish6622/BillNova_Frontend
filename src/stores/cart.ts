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
  notes: string;
}

interface CartState {
  lines: CartLine[];
  billDiscount: number;
  notes: string;
  addProduct: (p: Product) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setDiscount: (productId: string, discount: number) => void;
  setLineNotes: (productId: string, notes: string) => void;
  remove: (productId: string) => void;
  setBillDiscount: (value: number) => void;
  setNotes: (value: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  lines: [],
  billDiscount: 0,
  notes: "",

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
            notes: "",
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

  setLineNotes: (productId, notes) =>
    set((state) => ({
      lines: state.lines.map((l) => (l.productId === productId ? { ...l, notes } : l)),
    })),

  remove: (productId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

  setBillDiscount: (value) => set({ billDiscount: Math.max(0, value) }),
  setNotes: (value) => set({ notes: value }),
  clear: () => set({ lines: [], billDiscount: 0, notes: "" }),
}));
