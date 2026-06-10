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
      const q = val.trim().toLowerCase();
      if (q) {
        const m = COMMANDS.find((c) => !c.hidden && c.name.startsWith(q));
        if (m) setVal(m.name);
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
        <input
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={onKey}
          className="min-w-0 flex-1 bg-transparent text-term-text outline-none placeholder:text-term-faint"
          placeholder="type a command, or tap one above (try: help)"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label="terminal input"
        />
      </div>
    </div>
  );
}
