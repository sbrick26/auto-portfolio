"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Types out `text` char by char. `speed` is milliseconds per character. Returns
// the visible slice and whether it's done.
//
// The reveal is driven off requestAnimationFrame rather than a per-character
// setInterval. A short interval (the updates feed asks for single-digit ms)
// gets clamped and jittered by the browser, so the line both lagged behind its
// intended speed and stuttered. Advancing by REAL elapsed time each frame types
// at the true rate (so faster speeds actually land faster) and stays
// frame-aligned, which is what reads as smooth at any refresh rate.
//
// When the visitor has asked for reduced motion at the OS level, the typewriter
// effect is skipped entirely: the full text shows immediately and `done` is true
// on first render (which also drops the trailing animated cursor in TypedLine).
export function useTyped(text: string, speed = 16, enabled = true) {
  const reduceMotion = useReducedMotion();
  const animate = enabled && !reduceMotion;
  const [count, setCount] = useState(0);

  // Reset during render when the text changes (sanctioned React pattern,
  // avoids a setState-in-effect cascade).
  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setCount(0);
  }

  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    let start: number | null = null;
    let shownCount = 0;
    const tick = (now: number) => {
      if (start === null) start = now;
      const next = Math.min(text.length, Math.floor((now - start) / speed));
      if (next !== shownCount) {
        shownCount = next;
        setCount(next);
      }
      if (next < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, speed, animate]);

  const i = animate ? Math.min(count, text.length) : text.length;
  return { shown: text.slice(0, i), done: i >= text.length };
}

// A brief braille spinner for the boot sequence's status tokens: it cycles frames
// while a step is "working", then the caller settles it to a final token (ok / a
// value). Under reduced motion it renders a single static frame - no looping - so
// the settle still reads without any animation.
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function Spinner({ speed = 70, className = "" }: { speed?: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), speed);
    return () => clearInterval(id);
  }, [reduceMotion, speed]);
  return <span className={className}>{SPINNER_FRAMES[reduceMotion ? 0 : frame]}</span>;
}

export function Cursor({ className = "" }: { className?: string }) {
  return (
    <span
      className={`cursor-blink inline-block w-[0.55em] h-[1.05em] translate-y-[0.16em] bg-term-green/80 ${className}`}
    />
  );
}

// A single line that types itself in, then optionally calls onDone.
export function TypedLine({
  text,
  speed = 16,
  className = "",
  showCursor = true,
  onDone,
}: {
  text: string;
  speed?: number;
  className?: string;
  showCursor?: boolean;
  onDone?: () => void;
}) {
  const { shown, done } = useTyped(text, speed);
  const fired = useRef(false);
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      onDone?.();
    }
  }, [done, onDone]);
  return (
    <span className={className}>
      {shown}
      {showCursor && !done && <Cursor />}
    </span>
  );
}
