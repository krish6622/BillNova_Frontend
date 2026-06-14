import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Panel width (default ~480px — the 80mm-receipt-friendly side panel). */
  className?: string;
  title?: string;
  description?: string;
}

/**
 * Right-hand slide-over panel (no external dependency). ESC and backdrop-click close it.
 * Used by the Invoice Register to preview an invoice without leaving the page.
 */
export function Sheet({ open, onClose, children, className, title, description }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "absolute right-0 top-0 flex h-full w-[480px] max-w-[92vw] flex-col border-l border-border bg-card shadow-2xl",
              className,
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div className="min-w-0">
                {title && <h2 className="text-base font-semibold">{title}</h2>}
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
