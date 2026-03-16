import { create } from "zustand";
import type { BundledLanguage } from "shiki";

export interface ExecutionResult {
  output: string;
  error?: string;
  timestamp: number;
}

export type ViewMode = "code" | "preview";

interface ExecutorStore {
  isOpen: boolean;
  code: string;
  language: BundledLanguage;
  results: ExecutionResult[];
  isExecuting: boolean;
  viewMode: ViewMode;
  terminalCollapsed: boolean;

  openPanel: (code: string, language: BundledLanguage) => void;
  closePanel: () => void;
  addResult: (result: ExecutionResult) => void;
  clearResults: () => void;
  setExecuting: (executing: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleTerminal: () => void;
  setTerminalCollapsed: (collapsed: boolean) => void;
}

export const useExecutorStore = create<ExecutorStore>()((set) => ({
  isOpen: false,
  code: "",
  language: "python",
  results: [],
  isExecuting: false,
  viewMode: "code",
  terminalCollapsed: false,

  openPanel: (code, language) =>
    set({ 
      isOpen: true, 
      code, 
      language,
      viewMode: language === "html" ? "preview" : "code",
    }),

  closePanel: () =>
    set({ isOpen: false }),

  addResult: (result) =>
    set((state) => ({ results: [...state.results, result] })),

  clearResults: () =>
    set({ results: [] }),

  setExecuting: (isExecuting) =>
    set({ isExecuting }),

  setViewMode: (viewMode) =>
    set({ viewMode }),

  toggleTerminal: () =>
    set((state) => ({ terminalCollapsed: !state.terminalCollapsed })),

  setTerminalCollapsed: (terminalCollapsed) =>
    set({ terminalCollapsed }),
}));
