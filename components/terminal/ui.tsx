"use client";

import { motion } from "framer-motion";
import { useTerminal } from "./TerminalContext";

// Staggered reveal wrapper for output blocks.
export function Reveal({
  children,
  i = 0,
  className = "",
}: {
  children: React.ReactNode;
  i?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: i * 0.06, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-term-faint text-[11px] uppercase tracking-[0.18em] mb-2">
      {children}
    </div>
  );
}

// A clickable token that runs a command.
export function CmdChip({ cmd, label }: { cmd: string; label?: string }) {
  const { run } = useTerminal();
  return (
    <button
      onClick={() => run(cmd)}
      className="rounded-md border border-term-border bg-term-panel px-2.5 py-1 text-[13px] text-term-text/90 transition hover:border-term-green/50 hover:text-term-green active:scale-[0.97]"
    >
      {label ?? cmd}
    </button>
  );
}

export function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className="text-term-cyan underline decoration-term-cyan/30 underline-offset-4 transition hover:decoration-term-cyan"
    >
      {children}
    </a>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-term-border bg-term-panel2 px-1.5 py-0.5 text-[12px] text-term-dim">
      {children}
    </span>
  );
}

// Animated proficiency bar.
export function Bar({
  value,
  accent,
  delay = 0,
}: {
  value: number;
  accent: string;
  delay?: number;
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-term-border/60">
      <motion.div
        className="h-full rounded-full"
        style={{ background: accent }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.7, delay, ease: "easeOut" }}
      />
    </div>
  );
}
