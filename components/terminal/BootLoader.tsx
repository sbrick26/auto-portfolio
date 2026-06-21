"use client";

import { motion } from "framer-motion";

// A simple, one-shot loading screen that plays before the terminal appears: a
// dark full-viewport panel with the swayam.os mark and a sliding progress bar.
// It holds while the page settles, then cross-fades out as the terminal window
// animates in (Terminal drives that with the `leaving` flag). Once the terminal
// is fully there, the Welcome boot sequence types in as normal.
//
// Deliberately minimal - this replaced an earlier CRT power-on effect. It is a
// `fixed inset-0`, pointer-events-none overlay so it never blocks the window's
// skip handlers or the prompt underneath, and it is suppressed entirely under
// reduced motion (Terminal renders nothing and the terminal simply appears).
const OFF_SCREEN = "#04060a";

export function BootLoader({ leaving }: { leaving: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: OFF_SCREEN }}
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* the swayam.os mark: a phosphor-green prompt glyph in a soft-glowing
            rounded chip that scales in as the screen "boots" */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-term-green/30 bg-term-green/5 text-term-green"
          style={{ boxShadow: "0 0 28px rgba(126,240,172,0.18)" }}
        >
          <span className="text-2xl font-bold tracking-tight">{">_"}</span>
        </motion.div>

        {/* a slim indeterminate loading bar that slides across while it loads */}
        <div className="h-[3px] w-40 overflow-hidden rounded-full bg-term-green/10">
          <motion.div
            className="h-full w-1/3 rounded-full bg-term-green/80"
            style={{ boxShadow: "0 0 10px rgba(126,240,172,0.6)" }}
            initial={{ x: "-120%" }}
            animate={{ x: "360%" }}
            transition={{ duration: 0.9, ease: "easeInOut", repeat: Infinity }}
          />
        </div>

        <div className="text-[11px] uppercase tracking-[0.25em] text-term-faint">
          loading
        </div>
      </div>
    </motion.div>
  );
}
