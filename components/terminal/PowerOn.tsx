"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";

// CRT phosphor power-on: a strictly ONE-SHOT, sub-400ms energize flash that
// plays once the instant the terminal first mounts, immediately before the boot
// sequence types in. It makes the panel physically "switch on" rather than
// starting on plain text.
//
// It is an absolutely-positioned, pointer-events-none overlay pinned to the top
// of the welcome block (so it never blocks the window-level skip handlers and
// never overlays content afterward) that self-removes the instant its animation
// ends - so it can never repeat and can never sit on top of the text. Its height
// is fixed and independent of content, so it adds no layout shift: the boot text
// types in underneath while the flash settles and unmounts.
//
// Two CSS layers compose the effect (see the keyframes in globals.css): a
// vertical scanline-collapse - the raster "switching on" from a thin bright line
// that expands to full height - and a phosphor-green bloom that flashes and
// settles into the panel.
//
// Under reduced motion the flash is fully suppressed: the component renders
// nothing and the panel simply appears, matching the MotionConfig
// reducedMotion="user" contract and the globals.css reduced-motion block.
export function PowerOn() {
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);
  if (reduceMotion || done) return null;

  return (
    <div
      aria-hidden
      onAnimationEnd={(e) => {
        // Both child layers run a 340ms animation, so animationend bubbles
        // twice. Gate on the raster layer so the overlay unmounts exactly once.
        if (e.animationName === "power-on-raster") setDone(true);
      }}
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[240px] max-h-[55vh] overflow-hidden"
    >
      {/* phosphor bloom: a soft green radial glow that flashes then settles */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 78% at 50% 42%, rgba(126,240,172,0.5), rgba(126,240,172,0.1) 42%, transparent 72%)",
          animation: "power-on-bloom 340ms ease-out forwards",
        }}
      />
      {/* raster collapse: a bright scanline that expands from center to full height */}
      <div
        className="absolute inset-x-0 top-1/2 h-full origin-center -translate-y-1/2"
        style={{
          background:
            "linear-gradient(0deg, transparent, rgba(126,240,172,0.85) 47%, #f4fff8 50%, rgba(126,240,172,0.85) 53%, transparent)",
          animation: "power-on-raster 340ms ease-out forwards",
        }}
      />
    </div>
  );
}
