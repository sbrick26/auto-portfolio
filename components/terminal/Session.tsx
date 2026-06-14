"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Prompt } from "./Prompt";

export type Block = { id: number; input: string; node: React.ReactNode };

// How close (px) to the bottom still counts as "pinned" / "at bottom". Gives the
// reader a little slack so a stray pixel doesn't unstick the follow.
const STICK_THRESHOLD = 120;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reduceMotion = useReducedMotion();

  // `pinned` is the follow intent: true means glue the view to the newest line as
  // output streams in. Scroll up past the threshold and it flips off; the
  // jump-to-latest pill shows exactly when unpinned (there is content below).
  const [pinned, setPinned] = useState(true);

  const scrollToBottom = useCallback(
    (smooth: boolean) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth && !reduceMotion ? "smooth" : "auto",
      });
    },
    [reduceMotion],
  );

  // Re-evaluate whether we're near the bottom whenever the reader scrolls. Past
  // the threshold means they've scrolled up to re-read: unpin so we stop following.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance <= STICK_THRESHOLD);
  }, []);

  // A new command resets the follow: blocks.length grew, so glue back to the
  // newest line regardless of where a stale scroll left us. Re-pinning happens
  // during render (sanctioned React pattern, avoids a setState-in-effect cascade);
  // the actual scroll waits for the new block to lay out, in an effect below.
  const [prevLen, setPrevLen] = useState(blocks.length);
  if (prevLen !== blocks.length) {
    setPrevLen(blocks.length);
    setPinned(true);
  }

  useEffect(() => {
    scrollToBottom(true);
  }, [blocks.length, scrollToBottom]);

  // The marquee outputs (boot type-out, updates rows, skills bars/radar) animate
  // their HEIGHT after a block mounts without changing blocks.length. Follow that
  // growth while pinned so streaming text never streams in below the fold.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => {
      if (pinned) scrollToBottom(false);
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [pinned, scrollToBottom]);

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
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full space-y-5 overflow-y-auto px-4 py-4 text-[14px] leading-relaxed sm:px-5"
        >
          <div ref={contentRef} className="space-y-5">
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
          </div>
        </div>
        <AnimatePresence>
          {!pinned && (
            <motion.button
              type="button"
              aria-label="scroll to latest output"
              onClick={() => {
                setPinned(true);
                scrollToBottom(true);
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-term-green/60 bg-term-panel2/90 px-3 py-1.5 text-[12px] text-term-green shadow-lg backdrop-blur transition hover:border-term-green active:scale-95"
            >
              <span aria-hidden>&darr;</span>
              <span>latest</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <Prompt inputRef={inputRef} />
    </div>
  );
}
