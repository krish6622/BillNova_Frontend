import { cn } from "@/lib/utils";

/** Shimmering placeholder for premium loading states (no spinners). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted dark:bg-white/10", className)} />;
}
