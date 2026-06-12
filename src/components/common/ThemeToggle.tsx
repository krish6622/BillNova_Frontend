import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Premium pill Sun/Moon theme toggle (68×36). Spring-sliding knob, animated
 * icon swap, twinkling stars (dark) and drifting clouds (light).
 * Accessible: role="switch", aria-checked, keyboard-operable, focus ring.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggle } = useTheme();
  const reduce = useReducedMotion();
  const isDark = resolvedTheme === "dark";

  const spring = reduce
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 500, damping: 30 } as const);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-9 w-[68px] shrink-0 items-center rounded-full p-1 transition-colors duration-300 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "shadow-inner",
        isDark
          ? "bg-gradient-to-br from-[#0b1437] to-indigo-700"
          : "bg-gradient-to-br from-sky-300 to-white",
        className,
      )}
    >
      {/* Decorative layer */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        {isDark ? (
          [
            { top: "22%", left: "16%", d: 0 },
            { top: "55%", left: "30%", d: 0.6 },
            { top: "34%", left: "23%", d: 1.1 },
          ].map((s, i) => (
            <motion.span
              key={i}
              className="absolute h-[3px] w-[3px] rounded-full bg-white"
              style={{ top: s.top, left: s.left }}
              animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] }}
              transition={reduce ? undefined : { duration: 2.2, repeat: Infinity, delay: s.d }}
            />
          ))
        ) : (
          <>
            <span className="absolute right-[18%] top-[26%] h-2 w-4 rounded-full bg-white/85" />
            <span className="absolute right-[30%] top-[55%] h-1.5 w-3 rounded-full bg-white/70" />
          </>
        )}
      </span>

      {/* Knob */}
      <motion.span
        layout
        animate={{ x: isDark ? 32 : 0 }}
        transition={spring}
        className={cn(
          "relative z-10 flex h-7 w-7 items-center justify-center rounded-full",
          isDark
            ? "bg-slate-900 shadow-[0_0_10px_2px_rgba(129,140,248,0.6)]"
            : "bg-white shadow-[0_0_10px_2px_rgba(251,191,36,0.55)]",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
            >
              <Moon className="h-4 w-4 text-indigo-300" fill="currentColor" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, scale: 0, opacity: 0 }}
              animate={
                reduce
                  ? { rotate: 0, scale: 1, opacity: 1 }
                  : { rotate: 180, scale: [1, 1.12, 1], opacity: 1 }
              }
              exit={{ rotate: -90, scale: 0, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.4, ease: "easeInOut" }}
            >
              <Sun className="h-4 w-4 text-amber-500" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}
