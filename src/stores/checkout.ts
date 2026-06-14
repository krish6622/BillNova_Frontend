import { create } from "zustand";

import type { BillingType } from "@/features/sales/types";

export type PaymentMode = "Cash" | "UPI" | "Card";

export interface PaymentInput {
  mode: PaymentMode;
  amount: number;
  reference?: string | null;
}

interface CheckoutState {
  customer: string;
  customerMobile: string;
  customerGstin: string;
  isGstCustomer: boolean; // GST customer (B2B) vs regular walk-in
  billingType: BillingType; // WITH_GST | WITHOUT_GST (per bill; default WITHOUT_GST)
  notes: string;
  showGst: boolean; // CR-7: per-bill GST display (default Hide; only for WITH_GST)
  payments: PaymentInput[];
  payTouched: boolean; // whether the cashier has edited the tendered amount
  error: string | null;
  setCustomer: (v: string) => void;
  setCustomerMobile: (v: string) => void;
  setCustomerGstin: (v: string) => void;
  setIsGstCustomer: (v: boolean) => void;
  setBillingType: (v: BillingType) => void;
  setNotes: (v: string) => void;
  setShowGst: (v: boolean) => void;
  setPayments: (p: PaymentInput[]) => void;
  setPayTouched: (v: boolean) => void;
  setError: (v: string | null) => void;
  reset: () => void;
}

const initialPayments = (): PaymentInput[] => [{ mode: "Cash", amount: 0 }];

const RESET = {
  customer: "",
  customerMobile: "",
  customerGstin: "",
  isGstCustomer: false,
  billingType: "WITHOUT_GST" as BillingType, // spec: bills default to Without GST
  notes: "",
  showGst: false,
  payTouched: false,
  error: null,
};

/** CR-7: payment + checkout meta, separate from the cart so payment edits don't re-render
 *  the cart line list (and vice versa). */
export const useCheckout = create<CheckoutState>((set) => ({
  ...RESET,
  payments: initialPayments(),
  setCustomer: (v) => set({ customer: v }),
  setCustomerMobile: (v) => set({ customerMobile: v }),
  setCustomerGstin: (v) => set({ customerGstin: v }),
  setIsGstCustomer: (v) => set({ isGstCustomer: v }),
  setBillingType: (v) => set({ billingType: v }),
  setNotes: (v) => set({ notes: v }),
  setShowGst: (v) => set({ showGst: v }),
  setPayments: (p) => set({ payments: p }),
  setPayTouched: (v) => set({ payTouched: v }),
  setError: (v) => set({ error: v }),
  reset: () => set({ ...RESET, payments: initialPayments() }),
}));
