"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Prompt } from "./Prompt";

export type Block = { id: number; input: string; node: React.ReactNode };

function PromptEcho({ input }: { input: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="text-term-green">~</span>
      <span className="text-term-dim">&rsaquo;</span>
      <span className="text-term-text/80">{input}</span>
    </div>
  );
}

export function Session({ blocks, active }: { blocks: Block[]; active: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [blocks.length]);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  return (
    <div
      className={active ? "flex h-full flex-col" : "hidden"}
      onClick={(e) => {
        // don't steal focus from clicks on links/buttons
        const t = e.target as HTMLElement;
        if (!t.closest("a,button")) inputRef.current?.focus();
      }}
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-[14px] leading-relaxed sm:px-5">
        {blocks.map((b) => (
          <div key={b.id} className="space-y-2">
            {b.input && <PromptEcho input={b.input} />}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {b.node}
            </motion.div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <Prompt inputRef={inputRef} />
    </div>
  );
}
