"use client";

import { KeyboardEvent, RefObject, useState } from "react";
import { useTerminal } from "./TerminalContext";
import { COMMANDS, QUICK } from "@/lib/commands";

export function Prompt({
  inputRef,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const { run, history } = useTerminal();
  const [val, setVal] = useState("");
  const [hi, setHi] = useState<number | null>(null);

  // ghost-text suggestion: only for a single partial token, never mid-sentence
  const q = val.toLowerCase();
  const sug =
    q && !q.includes(" ")
      ? COMMANDS.find((c) => !c.hidden && c.name.startsWith(q) && c.name !== q)
      : undefined;

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      run(val);
      setVal("");
      setHi(null);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length) {
        const ni = hi === null ? history.length - 1 : Math.max(0, hi - 1);
        setHi(ni);
        setVal(history[ni]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hi !== null) {
        const ni = hi + 1;
        if (ni >= history.length) {
          setHi(null);
          setVal("");
        } else {
          setHi(ni);
          setVal(history[ni]);
        }
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (sug) setVal(sug.name);
    } else if (e.key === "ArrowRight" && sug) {
      // accept the ghost only when the caret sits at the end
      const el = e.currentTarget;
      if (el.selectionStart === val.length && el.selectionEnd === val.length) {
        e.preventDefault();
        setVal(sug.name);
      }
    }
  };

  return (
    <div className="border-t border-term-border bg-term-panel2/70 backdrop-blur">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-1.5 pt-2.5 sm:px-5">
        {QUICK.map((c) => (
          <button
            key={c}
            onClick={() => run(c)}
            className="shrink-0 rounded-md border border-term-border px-2.5 py-1 text-[12px] text-term-dim transition hover:border-term-green/50 hover:text-term-green active:scale-95"
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
        <span className="text-term-green">~</span>
        <span className="text-term-dim">&rsaquo;</span>
        <div className="relative min-w-0 flex-1">
          {sug && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre"
            >
              <span className="invisible">{val}</span>
              <span className="text-term-faint">{sug.name.slice(val.length)}</span>
            </div>
          )}
          <input
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKey}
            className="w-full bg-transparent text-term-text outline-none placeholder:text-term-faint"
            placeholder="type a command, or tap one above (try: help)"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="terminal input"
          />
        </div>
      </div>
    </div>
  );
}
