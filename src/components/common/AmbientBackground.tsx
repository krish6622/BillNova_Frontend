import { motion } from "framer-motion";

/**
 * Fixed full-viewport navy gradient with slowly drifting indigo/violet glows.
 * Sits behind the whole app for the "dark luxury fintech" ambience.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050B2B]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#070f33] via-[#050B2B] to-[#0a0820]" />
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-40 -top-24 h-[32rem] w-[32rem] rounded-full bg-indigo-600/20 blur-[140px]"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-40 top-1/3 h-[34rem] w-[34rem] rounded-full bg-violet-600/15 blur-[150px]"
      />
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-600/10 blur-[120px]"
      />
    </div>
  );
}
