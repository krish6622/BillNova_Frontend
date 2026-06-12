import { motion } from "framer-motion";

import { useTheme } from "@/lib/theme";

/**
 * Fixed full-viewport ambient backdrop. Dark = navy with indigo/violet glows;
 * Light = soft slate with faint sky/indigo glows.
 */
export function AmbientBackground() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-colors duration-500 ${
        dark ? "bg-[#050B2B]" : "bg-[#F8FAFC]"
      }`}
    >
      <div
        className={
          dark
            ? "absolute inset-0 bg-gradient-to-br from-[#070f33] via-[#050B2B] to-[#0a0820]"
            : "absolute inset-0 bg-gradient-to-br from-white via-[#F8FAFC] to-indigo-50"
        }
      />
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -left-40 -top-24 h-[32rem] w-[32rem] rounded-full blur-[140px] ${
          dark ? "bg-indigo-600/20" : "bg-indigo-400/15"
        }`}
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -right-40 top-1/3 h-[34rem] w-[34rem] rounded-full blur-[150px] ${
          dark ? "bg-violet-600/15" : "bg-sky-300/25"
        }`}
      />
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-[120px] ${
          dark ? "bg-blue-600/10" : "bg-indigo-200/40"
        }`}
      />
    </div>
  );
}
