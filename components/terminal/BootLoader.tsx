"use client";

import { motion } from "framer-motion";

// A one-shot loading screen that plays before the terminal appears: a dark
// full-viewport panel with the swayam.os mark wrapped in a spinning ring. It
// holds while the page settles, then recedes - the content eases up and scales
// back as the panel cross-fades out and the terminal window animates in
// (Terminal drives that with the `leaving` flag). Once the terminal is fully
// there, the Welcome boot sequence types in as normal.
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
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* the whole cluster eases up and scales back a touch as it leaves, so the
          loader feels like it recedes into the terminal rather than blinking off */}
      <motion.div
        className="flex flex-col items-center gap-6"
        animate={{ opacity: leaving ? 0 : 1, y: leaving ? -8 : 0, scale: leaving ? 1.04 : 1 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* the swayam.os mark inside a spinning phosphor-green ring: the chip
            scales in as the screen "boots", the ring sweeps continuously */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* the rotating ring: a transparent circle with one lit arc */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-term-green/15 border-t-term-green/90"
            style={{ boxShadow: "0 0 22px rgba(126,240,172,0.18)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-term-green/30 bg-term-green/5 text-term-green"
            style={{ boxShadow: "0 0 18px rgba(126,240,172,0.16)" }}
          >
            <span className="text-xl font-bold tracking-tight">{">_"}</span>
          </motion.div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.25em] text-term-faint">
          loading
          {/* three pulsing dots that ripple in sequence under the spinner */}
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="inline-block h-1 w-1 rounded-full bg-term-green/70"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.05, ease: "easeInOut", repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
