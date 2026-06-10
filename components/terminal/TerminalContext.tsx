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
