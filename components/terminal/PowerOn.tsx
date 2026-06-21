"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";

// CRT phosphor power-on: a strictly ONE-SHOT, full-viewport boot-up sequence that
// plays once the instant the terminal first mounts. It opens on a solid dark "off"
// screen covering the entire viewport, ignites a bright raster beam at the center,
// then slides that dark screen apart from the middle - the way a CRT draws its
// image - to reveal the terminal underneath. A phosphor-green bloom flashes as the
// panel energizes and a faint scanline texture settles out, so the panel reads as
// physically switching on rather than starting on plain text.
//
// It is a `fixed inset-0`, pointer-events-none overlay (so it never blocks the
// window-level skip handlers and never overlays content once it ends) that
// self-removes the instant its longest layer's animation ends - so it can never
// repeat and can never sit on top of the page. Being fixed and out of flow, it
// adds no layout shift: the boot text types in underneath while the sequence plays.
//
// Layers (keyframes live in globals.css): two dark shutters (top/bottom halves of
// the off-screen) that hold then retract from center; a bright beam that ignites at
// the seam and expands to full height as it fades; a phosphor-green bloom flash; and
// a faint CRT scanline texture. The shutters cover the full viewport on first paint,
// so the terminal is hidden from frame one and revealed only as they slide apart.
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
        // times. Gate on the bloom (the longest layer) so the overlay unmounts
        // exactly once, after the shutters have fully opened.
        if (e.animationName === "power-on-bloom") setDone(true);
      }}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {/* phosphor bloom: a soft green radial flash that energizes the whole panel
          then settles, layered above the shutters so it glows over both the dark
          off-screen and the terminal as it is revealed */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 45%, rgba(126,240,172,0.55), rgba(126,240,172,0.12) 45%, transparent 72%)",
          animation: "power-on-bloom 880ms ease-out forwards",
        }}
      />
      {/* faint CRT scanline texture that fades in with the energize flash then
          settles out, for a touch of phosphor grain */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)",
          animation: "power-on-scanlines 820ms ease-out forwards",
        }}
      />
      {/* dark off-screen, top half: holds, then slides up out of frame */}
      <div
        className="absolute inset-x-0 top-0 h-[51%]"
        style={{
          background: OFF_SCREEN,
          willChange: "transform",
          animation: "power-on-shutter-top 780ms cubic-bezier(0.7,0,0.3,1) forwards",
        }}
      />
      {/* dark off-screen, bottom half: holds, then slides down out of frame */}
      <div
        className="absolute inset-x-0 bottom-0 h-[51%]"
        style={{
          background: OFF_SCREEN,
          willChange: "transform",
          animation: "power-on-shutter-bottom 780ms cubic-bezier(0.7,0,0.3,1) forwards",
        }}
      />
      {/* raster beam: a bright scanline that ignites at the center seam and expands
          to full height as it fades - the panel "switching on" */}
      <div
        className="absolute inset-x-0 top-1/2 h-full origin-center -translate-y-1/2"
        style={{
          background:
            "linear-gradient(0deg, transparent, rgba(126,240,172,0.85) 47%, #f4fff8 50%, rgba(126,240,172,0.85) 53%, transparent)",
          willChange: "transform, opacity",
          animation: "power-on-beam 700ms ease-out forwards",
        }}
      />
    </div>
  );
}
