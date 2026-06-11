"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { findCommand } from "@/lib/commands";
import { TerminalCtx } from "./TerminalContext";
import { Session, Block } from "./Session";
import { CommandPalette } from "./CommandPalette";
import { Welcome, RENDERERS, ErrorOutput } from "./outputs";

// Counter lives on globalThis so dev hot reloads can't reset it and hand out
// duplicate ids to tabs/blocks that are still mounted.
const g = globalThis as typeof globalThis & { __termUid?: number };
const nid = () => {
  g.__termUid = (g.__termUid ?? 0) + 1;
  return g.__termUid;
};

type Tab = { id: number; title: string; blocks: Block[] };

function renderInput(input: string): { clear?: boolean; node?: React.ReactNode; title?: string } {
  const cmd = findCommand(input);
  if (cmd?.special === "clear") return { clear: true };
  if (cmd && RENDERERS[cmd.name]) return { node: RENDERERS[cmd.name](), title: cmd.name };
  return { node: <ErrorOutput input={input} /> };
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
          blocks: [...t.blocks, { id: nid(), input, node: res.node }],
        };
      })
    );
  }, []);

  const openTab = useCallback((cmd?: string) => {
    const tab: Tab = { id: nid(), title: "shell", blocks: [] };
    if (cmd) {
      const res = renderInput(cmd);
      if (!res.clear) {
        tab.blocks = [{ id: nid(), input: cmd, node: res.node }];
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
      <div className="flex h-dvh w-full flex-col overflow-hidden border-term-border bg-term-panel/80 shadow-2xl shadow-black/40 backdrop-blur-xl sm:h-[80vh] sm:max-w-3xl sm:rounded-xl sm:border md:max-w-4xl">
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
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onPick={(cmd) => run(cmd)}
      />
    </TerminalCtx.Provider>
    </MotionConfig>
  );
}
