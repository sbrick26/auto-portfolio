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

// The command name a rail tick advertises. The opening welcome block has no
// echoed input, so it gets a friendly label instead of an empty tooltip.
function blockLabel(input: string): string {
  return input || "start";
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

  // Section rail state: a ref to each block's wrapper div (keyed by id) so a tick
  // can scroll its block to the top, and the id of the block currently sitting at
  // the top of the viewport (highlighted in the rail).
  const blockRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const visible = useRef<Map<number, boolean>>(new Map());
  const [activeBlock, setActiveBlock] = useState<number | null>(null);

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

  // Scroll a given block to the top of the viewport (its prompt echo included),
  // honouring reduced-motion. Used by both the rail ticks and the keyboard steps.
  const scrollToBlock = useCallback(
    (id: number) => {
      blockRefs.current.get(id)?.scrollIntoView({
        block: "start",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [reduceMotion],
  );

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [reduceMotion]);

  // Track which block is nearest the top of the viewport. The rootMargin collapses
  // the active band to roughly the top third of the scroll area, so the active
  // tick is the first block (in DOM order) still intersecting that band.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || blocks.length < 2) {
      setActiveBlock(blocks[0]?.id ?? null);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = Number((e.target as HTMLElement).dataset.blockId);
          visible.current.set(id, e.isIntersecting);
        }
        for (const b of blocks) {
          if (visible.current.get(b.id)) {
            setActiveBlock(b.id);
            break;
          }
        }
      },
      { root, rootMargin: "0px 0px -66% 0px", threshold: 0 },
    );
    for (const b of blocks) {
      const el = blockRefs.current.get(b.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [blocks]);

  // Keyboard wayfinding for the active session. Alt+Arrow steps between output
  // blocks and Alt+Home jumps to the very top; the Alt modifier keeps these clear
  // of the prompt's bare ArrowUp/Down history navigation.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "Home") {
        e.preventDefault();
        scrollToTop();
        return;
      }
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (blocks.length === 0) return;
      e.preventDefault();
      const cur = activeBlock === null ? 0 : blocks.findIndex((b) => b.id === activeBlock);
      const next = e.key === "ArrowUp" ? Math.max(0, cur - 1) : Math.min(blocks.length - 1, cur + 1);
      scrollToBlock(blocks[next].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, blocks, activeBlock, scrollToBlock, scrollToTop]);

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
              <div
                key={b.id}
                data-block-id={b.id}
                ref={(el) => {
                  if (el) blockRefs.current.set(b.id, el);
                  else blockRefs.current.delete(b.id);
                }}
                className="space-y-2"
              >
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
        {/* section rail: thin command ticks pinned to the right edge. Each tick
            scrolls its block to the top; the active block highlights in green.
            Labels stay collapsed (expanding on hover) so the rail never crowds the
            narrow mobile width. */}
        {blocks.length >= 2 && (
          <nav
            aria-label="jump to output"
            className="absolute right-1 top-1/2 z-10 flex max-h-[80%] -translate-y-1/2 flex-col items-end gap-2 overflow-y-auto no-scrollbar py-1"
          >
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="jump to top"
              title="top"
              className="group flex items-center gap-1.5 text-term-faint transition-colors hover:text-term-green"
            >
              <span className="max-w-0 overflow-hidden whitespace-nowrap rounded bg-term-panel2/90 text-[10px] opacity-0 transition-all duration-150 group-hover:max-w-[140px] group-hover:px-1.5 group-hover:py-0.5 group-hover:opacity-100">
                top
              </span>
              <span aria-hidden className="text-[10px] leading-none">
                &uarr;
              </span>
            </button>
            {blocks.map((b) => {
              const isActive = b.id === activeBlock;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => scrollToBlock(b.id)}
                  aria-label={`jump to ${blockLabel(b.input)}`}
                  aria-current={isActive ? "true" : undefined}
                  title={blockLabel(b.input)}
                  className="group flex items-center gap-1.5"
                >
                  <span
                    className={`max-w-0 overflow-hidden whitespace-nowrap rounded bg-term-panel2/90 text-[10px] opacity-0 transition-all duration-150 group-hover:max-w-[140px] group-hover:px-1.5 group-hover:py-0.5 group-hover:opacity-100 ${
                      isActive ? "text-term-green" : "text-term-dim"
                    }`}
                  >
                    {blockLabel(b.input)}
                  </span>
                  <span
                    className={`h-0.5 rounded-full transition-all ${
                      isActive
                        ? "w-4 bg-term-green"
                        : "w-2.5 bg-term-faint group-hover:w-4 group-hover:bg-term-dim"
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        )}
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
