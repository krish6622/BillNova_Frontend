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
        // Light: clean white surface + soft shadow. Dark: frosted glass.
        "rounded-2xl border border-border bg-card shadow-sm",
        "dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] dark:backdrop-blur-xl",
        hover &&
          "transition-all hover:shadow-md dark:hover:border-white/20 dark:hover:bg-white/[0.06]",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
