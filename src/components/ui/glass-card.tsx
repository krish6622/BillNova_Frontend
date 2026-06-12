import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
}

/** Frosted glass surface — translucent over the dark ambient background. */
export function GlassCard({ className, hover = false, children, ...props }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]",
        hover && "transition-colors hover:border-white/20 hover:bg-white/[0.06]",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
