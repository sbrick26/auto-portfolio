"use client";

import { createContext, useContext } from "react";

type TerminalApi = {
  run: (input: string) => void;
  openTab: (cmd?: string) => void;
  history: string[];
  openPalette: () => void;
};

export const TerminalCtx = createContext<TerminalApi>({
  run: () => {},
  openTab: () => {},
  history: [],
  openPalette: () => {},
});

export const useTerminal = () => useContext(TerminalCtx);

// True once the boot loader has finished and the terminal window has fully
// appeared - the signal the Welcome boot sequence waits on before it starts
// typing, so the boot text only runs after the terminal is visibly there. The
// default is `true` so anything rendered outside the Terminal provider (and the
// reduced-motion path, which skips the loader) boots immediately.
export const BootReadyCtx = createContext(true);

export const useBootReady = () => useContext(BootReadyCtx);
