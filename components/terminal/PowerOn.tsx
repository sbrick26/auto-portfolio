"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";

// Boot loader: a strictly ONE-SHOT, full-viewport loading sequence that plays
// once the instant the terminal first mounts - the way an app shows a splash
// before its UI is ready. It runs in four beats:
//   1. a solid black screen covering the whole viewport (the "off" state),
//   2. a loading spinner that turns at the center while the screen "boots",
//   3. the spinner fades and a single bright line draws in across the middle,
//   4. that line opens up - the black screen splits along the seam, sliding
//      apart from the center to reveal the terminal underneath.
//
// It is a `fixed inset-0`, pointer-events-none overlay (so it never blocks the
// window-level skip handlers and never overlays content once it ends) that
// self-removes the instant its longest layer's animation ends - so it can never
// repeat and can never sit on top of the page. Being fixed and out of flow, it
// adds no layout shift: the boot text types in underneath while the sequence
// plays, hidden by the black screen until the seam opens.
//
// Layers (keyframes live in globals.css): two black panels (top/bottom halves
// of the off-screen) that hold, then retract from center; a spinner that turns
// during the load then fades; and the seam line that draws in, holds, then
// expands and fades as the panels part. The panels cover the full viewport on
// first paint, so the terminal is hidden from frame one and revealed only as
// they slide apart.
//
// Under reduced motion the sequence is fully suppressed: the component renders
// nothing and the terminal simply appears, matching the MotionConfig
// reducedMotion="user" contract and the globals.css reduced-motion block.
const OFF_SCREEN = "#04060a";

export function PowerOn() {
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);
  if (reduceMotion || done) return null;

  return (
    <div
      aria-hidden
      onAnimationEnd={(e) => {
        // Every layer runs its own animation, so animationend bubbles several
        // times. Gate on the bottom panel's open (the longest layer) so the
        // overlay unmounts exactly once, after the screen has fully parted.
        if (e.animationName === "power-on-open-bottom") setDone(true);
      }}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {/* off-screen, top half: holds black through the load, then slides up out
          of frame as the seam opens */}
      <div
        className="absolute inset-x-0 top-0 h-[51%]"
        style={{
          background: OFF_SCREEN,
          willChange: "transform",
          animation: "power-on-open-top 560ms cubic-bezier(0.7,0,0.3,1) 1500ms forwards",
        }}
      />
      {/* off-screen, bottom half: holds black through the load, then slides down
          out of frame as the seam opens */}
      <div
        className="absolute inset-x-0 bottom-0 h-[51%]"
        style={{
          background: OFF_SCREEN,
          willChange: "transform",
          animation: "power-on-open-bottom 560ms cubic-bezier(0.7,0,0.3,1) 1500ms forwards",
        }}
      />
      {/* loading spinner: a phosphor-green ring with a bright arc that turns
          while the screen boots, then fades out just before the seam line draws
          in. Centered over the black screen. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="h-9 w-9 rounded-full"
          style={{
            border: "2px solid rgba(126,240,172,0.18)",
            borderTopColor: "rgba(126,240,172,0.95)",
            willChange: "transform, opacity",
            animation:
              "power-on-spin 720ms linear infinite, power-on-spinner-out 260ms ease 1080ms forwards",
          }}
        />
      </div>
      {/* seam line: a thin bright line that draws in across the middle after the
          spinner fades, holds, then expands and fades as the panels part - the
          line "opening up" into the terminal */}
      <div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 origin-center"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(126,240,172,0.9) 25%, #f4fff8 50%, rgba(126,240,172,0.9) 75%, transparent)",
          boxShadow: "0 0 12px rgba(126,240,172,0.7)",
          willChange: "transform, opacity",
          animation: "power-on-line 920ms ease-out 1140ms backwards",
        }}
      />
    </div>
  );
}
