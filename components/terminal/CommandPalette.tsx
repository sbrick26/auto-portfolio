"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COMMANDS } from "@/lib/commands";

export function CommandPalette({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (cmd: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = COMMANDS.filter(
    (c) => !c.hidden && (c.name.includes(q.toLowerCase()) || c.description.includes(q.toLowerCase()))
  );

  // Reset during render when the palette opens (avoids setState-in-effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQ("");
      setSel(0);
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[18vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md overflow-hidden rounded-xl border border-term-border bg-term-panel shadow-2xl"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") onClose();
                else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSel((s) => Math.min(list.length - 1, s + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSel((s) => Math.max(0, s - 1));
                } else if (e.key === "Enter" && list[sel]) {
                  onPick(list[sel].name);
                  onClose();
                }
              }}
              placeholder="run a command ..."
              className="w-full border-b border-term-border bg-transparent px-4 py-3 text-term-text outline-none placeholder:text-term-faint"
              spellCheck={false}
            />
            <div className="max-h-72 overflow-y-auto py-1">
              {list.map((c, i) => (
                <button
                  key={c.name}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => {
                    onPick(c.name);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[13px] ${
                    i === sel ? "bg-term-green/10" : ""
                  }`}
                >
                  <span className={i === sel ? "text-term-green" : "text-term-text/90"}>
                    {c.name}
                  </span>
                  <span className="truncate text-[12px] text-term-faint">{c.description}</span>
                </button>
              ))}
              {list.length === 0 && (
                <div className="px-4 py-3 text-[13px] text-term-faint">no matches</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
