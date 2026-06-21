"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { findCommand } from "@/lib/commands";
import { TerminalCtx, BootReadyCtx } from "./TerminalContext";
import { Session, Block } from "./Session";
import { CommandPalette } from "./CommandPalette";
import { BootLoader } from "./BootLoader";
import { Welcome, RENDERERS, ErrorOutput } from "./outputs";

// How long the loading screen holds before the terminal window starts to appear.
const SPLASH_MS = 1000;

// The boot runs in three beats: the loading screen shows, then it cross-fades
// out while the terminal window animates in, then - once the window is fully
// there - the Welcome boot sequence types in. Under reduced motion the whole
// intro is skipped and the terminal simply appears, booted.
type BootPhase = "splash" | "enter" | "ready";

// Counter lives on globalThis so dev hot reloads can't reset it and hand out
// duplicate ids to tabs/blocks that are still mounted.
const g = globalThis as typeof globalThis & { __termUid?: number };
const nid = () => {
  g.__termUid = (g.__termUid ?? 0) + 1;
  return g.__termUid;
};

type Tab = { id: number; title: string; blocks: Block[] };

function renderInput(input: string): { clear?: boolean; node?: React.ReactNode; title?: string; anchor?: "top" } {
  const cmd = findCommand(input);
  if (cmd?.special === "clear") return { clear: true };
  // `updates` is a live tail and follows the bottom; every other section (and the
  // not-found message) anchors its top to the top of the viewport when it prints.
  const anchor = cmd?.name === "updates" ? undefined : ("top" as const);
  if (cmd && RENDERERS[cmd.name]) {
    const args = input.split(/\s+/).slice(1).join(" ");
    return { node: RENDERERS[cmd.name](args), title: cmd.name, anchor };
  }
  return { node: <ErrorOutput input={input} />, anchor };
}

export function Terminal() {
  const [tabs, setTabs] = useState<Tab[]>(() => [
    { id: nid(), title: "welcome", blocks: [{ id: nid(), input: "", node: <Welcome /> }] },
  ]);
  const [activeId, setActiveId] = useState<number>(tabs[0].id);
  const [history, setHistory] = useState<string[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const activeRef = useRef(activeId);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  // Boot intro orchestration (loading screen -> terminal appears -> boot text).
  // Under reduced motion there is no intro: start booted, the terminal simply
  // appears.
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<BootPhase>(reduceMotion ? "ready" : "splash");

  // Hold the loading screen briefly, then hand off to the window's entrance.
  useEffect(() => {
    if (reduceMotion) return;
    const t = setTimeout(() => setPhase("enter"), SPLASH_MS);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  // Skippable intro: while the loading screen or window entrance plays, any key,
  // click, or tap completes it at once and boots the terminal - the same fast
  // handoff the Welcome boot sequence already offers repeat visitors.
  useEffect(() => {
    if (reduceMotion || phase === "ready") return;
    const skip = () => setPhase("ready");
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [reduceMotion, phase]);

  const windowIn = reduceMotion || phase === "enter" || phase === "ready";
  const bootReady = reduceMotion || phase === "ready";
  const showLoader = !reduceMotion && phase !== "ready";

  const run = useCallback((rawInput: string) => {
    const input = rawInput.trim();
    if (!input) return;
    setHistory((h) => (h[h.length - 1] === input ? h : [...h, input]));
    const res = renderInput(input);
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeRef.current) return t;
        if (res.clear) return { ...t, blocks: [] };
        return {
          ...t,
          title: res.title ?? t.title,
          blocks: [...t.blocks, { id: nid(), input, node: res.node, anchor: res.anchor }],
        };
      })
    );
  }, []);

  const openTab = useCallback((cmd?: string) => {
    const tab: Tab = { id: nid(), title: "shell", blocks: [] };
    if (cmd) {
      const res = renderInput(cmd);
      if (!res.clear) {
        tab.blocks = [{ id: nid(), input: cmd, node: res.node, anchor: res.anchor }];
        tab.title = res.title ?? "shell";
      }
    }
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, []);

  const closeTab = useCallback((id: number) => {
    setTabs((prev) => {
      if (prev.length === 1) return prev;
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      setActiveId((cur) => (cur === id ? next[Math.max(0, idx - 1)].id : cur));
      return next;
    });
  }, []);

  // global cmd/ctrl + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <TerminalCtx.Provider value={{ run, openTab, history, openPalette: () => setPaletteOpen(true) }}>
      <BootReadyCtx.Provider value={bootReady}>
      {showLoader && <BootLoader leaving={phase !== "splash"} />}
      <motion.div
        // The terminal window appears after the loading screen: it fades and
        // eases up into place, and once that entrance completes the boot
        // sequence is cleared to type (bootReady). Under reduced motion it is
        // rendered in place from the first frame with no animation.
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
        animate={
          windowIn
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.97, y: 12 }
        }
        transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
        onAnimationComplete={() => {
          if (phase === "enter") setPhase("ready");
        }}
        className="flex h-dvh w-full flex-col overflow-hidden border-term-border bg-term-panel/80 shadow-2xl shadow-black/40 backdrop-blur-xl sm:h-[80vh] sm:max-w-3xl sm:rounded-xl sm:border md:max-w-4xl"
      >
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-term-border bg-term-panel2/60 px-3 py-2">
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="h-3 w-3 rounded-full bg-term-red/80" />
            <span className="h-3 w-3 rounded-full bg-term-yellow/80" />
            <span className="h-3 w-3 rounded-full bg-term-green/80" />
          </div>

          {/* tabs */}
          <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-md px-2.5 py-1 text-[12px] transition ${
                  t.id === activeId
                    ? "bg-term-bg text-term-text"
                    : "text-term-faint hover:text-term-dim"
                }`}
              >
                <span className={t.id === activeId ? "text-term-green" : ""}>›</span>
                <span className="max-w-[120px] truncate">{t.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(t.id);
                    }}
                    className="text-term-faint opacity-0 transition hover:text-term-red group-hover:opacity-100"
                    aria-label="close tab"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => openTab()}
              className="shrink-0 rounded-md px-2 py-1 text-[14px] text-term-faint transition hover:text-term-green"
              aria-label="new tab"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setPaletteOpen(true)}
            className="shrink-0 rounded-md border border-term-border px-2 py-1 text-[11px] text-term-faint transition hover:text-term-dim"
            aria-label="command palette"
          >
            ⌘K
          </button>
        </div>

        {/* body: all sessions mounted, only active visible */}
        <div className="relative min-h-0 flex-1">
          {tabs.map((t) => (
            <div key={t.id} className={t.id === activeId ? "absolute inset-0" : "hidden"}>
              <Session blocks={t.blocks} active={t.id === activeId} />
            </div>
          ))}
        </div>
      </motion.div>
      </BootReadyCtx.Provider>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onPick={(cmd) => run(cmd)}
      />
    </TerminalCtx.Provider>
    </MotionConfig>
  );
}
