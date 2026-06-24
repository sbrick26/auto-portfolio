"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// A one-shot cold-boot screen that plays before the terminal appears: a deep,
// near-black panel where the swayam.os mark powers on inside a pair of
// counter-rotating reactor rings, over a faint drifting grid, while a real
// progress rail fills and its status word advances (initializing -> mounting ->
// loading -> ready). It holds while the page settles, then recedes - the whole
// cluster eases up and scales back as the panel cross-fades out and the terminal
// window animates in (Terminal drives that with the `leaving` flag). Once the
// terminal is fully there, the Welcome boot sequence types in as normal.
//
// It is a `fixed inset-0` pointer-events-none overlay so it never blocks the
// window's skip handlers or the prompt underneath, and it is `aria-hidden` and
// suppressed entirely under reduced motion (Terminal renders nothing and the
// terminal simply appears).
const OFF_SCREEN = "#04060a";
const GREEN = "126,240,172"; // --color-term-green, rgb channels for glow/alpha
const CYAN = "102,226,235"; // --color-term-cyan, rgb channels for accents

// Cosmetic POST-style status words, keyed off the progress value. The real boot
// diagnostics type in once the terminal appears; these just give the rail
// something honest to narrate as it fills.
function statusFor(pct: number): string {
  if (pct < 34) return "initializing";
  if (pct < 68) return "mounting /home";
  if (pct < 100) return "loading profile";
  return "ready";
}

export function BootLoader({ leaving }: { leaving: boolean }) {
  // A determinate fill that climbs to ~95% across the hold; the moment the loader
  // is told to leave it reads 100% (derived below, so the effect never sets state
  // synchronously). Drives both the rail width and the status word so they read
  // as one motion. The interval is cleared on unmount and never runs under
  // reduced motion, because Terminal does not render the loader then.
  const [climb, setClimb] = useState(0);
  useEffect(() => {
    if (leaving) return;
    const id = setInterval(() => {
      setClimb((p) => (p >= 95 ? 95 : Math.min(95, p + 2.6)));
    }, 28);
    return () => clearInterval(id);
  }, [leaving]);
  const pct = leaving ? 100 : climb;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: OFF_SCREEN }}
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* background depth: a breathing radial glow, a faint dot grid that fades
          out toward the edges, and slow drifting scanlines - all very low
          contrast, there to make the mark sit on a living screen rather than a
          flat fill. */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(620px 460px at 50% 42%, rgba(${GREEN},0.10), transparent 70%)`,
        }}
        animate={{ opacity: leaving ? 0 : [0.55, 1, 0.55] }}
        transition={
          leaving
            ? { duration: 0.4 }
            : { duration: 4.5, ease: "easeInOut", repeat: Infinity }
        }
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(rgba(${GREEN},0.16) 1px, transparent 1px)`,
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(440px 440px at 50% 42%, #000 0%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(440px 440px at 50% 42%, #000 0%, transparent 72%)",
        }}
      />
      <motion.div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(${GREEN},0.05) 0px, rgba(${GREEN},0.05) 1px, transparent 1px, transparent 4px)`,
        }}
        animate={{ backgroundPositionY: leaving ? 0 : ["0px", "4px"] }}
        transition={
          leaving ? { duration: 0.3 } : { duration: 0.5, ease: "linear", repeat: Infinity }
        }
      />

      {/* the whole cluster eases up and scales back a touch as it leaves, so the
          loader feels like it recedes into the terminal rather than blinking off */}
      <motion.div
        className="relative flex flex-col items-center gap-7"
        animate={{ opacity: leaving ? 0 : 1, y: leaving ? -10 : 0, scale: leaving ? 1.05 : 1 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* hero mark: the swayam.os chip inside two counter-rotating rings with a
            single dot orbiting the outer track - a small reactor warming up. */}
        <div className="relative grid h-28 w-28 place-items-center">
          {/* outer ring: full dim circle with one bright sweeping arc */}
          <motion.div
            className="absolute inset-0 rounded-full border border-t-2"
            style={{
              borderColor: `rgba(${GREEN},0.12)`,
              borderTopColor: `rgba(${GREEN},0.9)`,
              boxShadow: `0 0 26px rgba(${GREEN},0.16)`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
          />
          {/* inner ring: tighter, spins the other way in cyan for depth */}
          <motion.div
            className="absolute inset-[14px] rounded-full border border-r-2"
            style={{
              borderColor: `rgba(${CYAN},0.10)`,
              borderRightColor: `rgba(${CYAN},0.85)`,
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
          />
          {/* orbiting dot riding the outer track */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.9, ease: "linear", repeat: Infinity }}
          >
            <span
              className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
              style={{ background: `rgb(${GREEN})`, boxShadow: `0 0 10px rgba(${GREEN},0.9)` }}
            />
          </motion.div>

          {/* the chip: scales in as the screen boots, then breathes a soft glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: 1,
              scale: 1,
              boxShadow: leaving
                ? `0 0 22px rgba(${GREEN},0.22)`
                : [
                    `0 0 16px rgba(${GREEN},0.14)`,
                    `0 0 30px rgba(${GREEN},0.30)`,
                    `0 0 16px rgba(${GREEN},0.14)`,
                  ],
            }}
            transition={{
              opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
              boxShadow: { duration: 2.6, ease: "easeInOut", repeat: Infinity },
            }}
            className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-term-green/30 bg-term-green/5 text-term-green"
          >
            <span className="text-2xl font-bold tracking-tight">{">_"}</span>
          </motion.div>
        </div>

        {/* wordmark + tag */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-sm tracking-[0.35em] text-term-text/90">
            swayam<span className="text-term-green">.os</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-term-faint">cold boot</div>
        </div>

        {/* progress rail: a glowing fill with a shimmer running across it, and a
            status word that advances with the percentage. */}
        <div className="flex w-56 flex-col gap-2">
          <div
            className="relative h-[3px] w-full overflow-hidden rounded-full"
            style={{ background: `rgba(${GREEN},0.10)` }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, rgba(${GREEN},0.85), rgb(${CYAN}))`,
                boxShadow: `0 0 12px rgba(${GREEN},0.55)`,
              }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 w-10"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)`,
              }}
              animate={{ x: leaving ? 0 : ["-40px", "224px"] }}
              transition={
                leaving ? { duration: 0.2 } : { duration: 1.1, ease: "easeInOut", repeat: Infinity }
              }
            />
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-term-faint">
            <span className="flex items-center gap-1.5">
              {statusFor(pct)}
              <span className="cursor-blink text-term-green">_</span>
            </span>
            <span className="tabular-nums text-term-dim">{Math.round(pct)}%</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
