import { create } from "zustand";

interface ProjectState {
  isOpen: boolean;
  projectId: string | null;
  viewMode: "editor" | "preview" | "split";
  activeTab: "workspace" | "terminal";
  isGenerating: boolean;
  // 文件更新时间戳，用于触发 ProjectPanel 重新加载文件
  fileUpdateTrigger: number;
  
  openPanel: (projectId: string) => void;
  closePanel: () => void;
  setProjectId: (projectId: string | null) => void;
  setViewMode: (mode: "editor" | "preview" | "split") => void;
  setActiveTab: (tab: "workspace" | "terminal") => void;
  setGenerating: (isGenerating: boolean) => void;
  // 触发文件更新（当工具完成文件操作时调用）
  triggerFileUpdate: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  isOpen: false,
  projectId: null,
  viewMode: "split",
  activeTab: "workspace",
  isGenerating: false,
  fileUpdateTrigger: 0,
  
  openPanel: (projectId: string) => set({ isOpen: true, projectId }),
  // closePanel 只关闭面板，不清除 projectId（允许重新打开）
  closePanel: () => set({ isOpen: false }),
  // 单独设置 projectId（用于切换对话时更新）
  setProjectId: (projectId: string | null) => set({ projectId, isOpen: !!projectId }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGenerating: (isGenerating: boolean) => set({ isGenerating }),
  triggerFileUpdate: () => set((state) => ({ fileUpdateTrigger: state.fileUpdateTrigger + 1 })),
}));
