"use client";

import { useEffect, useRef, useState } from "react";

// Types out `text` char by char. Returns the visible slice and whether it's done.
export function useTyped(text: string, speed = 16, enabled = true) {
  const [tick, setTick] = useState(0);

  // Reset during render when the text changes (sanctioned React pattern,
  // avoids a setState-in-effect cascade).
  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setTick(0);
  }

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setTick((k) => {
        if (k >= text.length) {
          clearInterval(id);
          return k;
        }
        return k + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, enabled]);

  const i = enabled ? Math.min(tick, text.length) : text.length;
  return { shown: text.slice(0, i), done: i >= text.length };
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
