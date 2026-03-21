"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChatContentSurface,
  ChatHeaderActions,
  ChatSidebarToggle,
} from "@/components/chat/layout";
import { ChatSidebar } from "@/components/chat/sidebar";
import { DataStreamProvider } from "@/components/provider/data-stream-provider";
import { ExecutorPanel } from "@/components/executor/executor-panel";
import { ProjectPanel } from "@/components/project/project-panel";
import { useExecutorStore } from "@/store/executor";
import { useProjectStore } from "@/store/project";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const isExecutorOpen = useExecutorStore((s) => s.isOpen);
  const closeExecutorPanel = useExecutorStore((s) => s.closePanel);
  const isProjectOpen = useProjectStore((s) => s.isOpen);
  const closeProjectPanel = useProjectStore((s) => s.closePanel);
  const pathname = usePathname();

  // 判断是否有面板打开
  const isPanelOpen = isExecutorOpen || isProjectOpen;

  // Close panels on route change
  useEffect(() => {
    closeExecutorPanel();
    closeProjectPanel();
  }, [pathname, closeExecutorPanel, closeProjectPanel]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <DataStreamProvider>
      <div className={cn(
        "flex h-screen w-full overflow-hidden antialiased transition-colors duration-300 selection:bg-blue-100 selection:text-blue-900",
        "bg-zinc-50 text-zinc-900", // Light
        "dark:bg-black dark:text-zinc-100 dark:selection:bg-white/20 dark:selection:text-white" // Dark
      )}>
        {/* Desktop Sidebar */}
        <ChatSidebar isOpen={isSidebarOpen} />

        {/* Mobile Sidebar (Drawer) */}
        <ChatSidebar
          isOpen={isSidebarOpen}
          isMobile={true}
          onClose={closeSidebar}
        />

        <main
          className={cn(
            "flex-1 flex h-full relative transition-all duration-400 ease-[cubic-bezier(0.19,1,0.22,1)]",
            // Desktop: padding when sidebar open
            !isMobile && isSidebarOpen ? "py-2 pr-2 pl-0" : "p-0",
            // Mobile: no padding
            isMobile && "p-0"
          )}
        >
          <div
            className={cn(
              "flex-1 flex flex-col relative overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.19,1,0.22,1)]",
              // Light Background & Border
              "bg-white",
              // Dark Background & Border
              "dark:bg-zinc-950",
              
              // Desktop: rounded corners when sidebar open
              !isMobile && isSidebarOpen
                ? "rounded-l-2xl border-l border-t border-b shadow-2xl border-zinc-200 dark:border-zinc-800/50"
                : "rounded-none border-none"
            )}
          >
            <ChatSidebarToggle isOpen={isSidebarOpen} onToggle={toggleSidebar} />
            <ChatHeaderActions />

            {/* Main content area with chat and panels side by side */}
            <div className="relative flex flex-1 overflow-hidden gap-3 p-3 pt-14">
              {/* Chat area with custom scrollbar */}
              <div
                className={cn(
                  "relative z-10 flex-1 h-full transition-all duration-300",
                  isPanelOpen && !isMobile && "flex-[0.45]"
                )}
              >
                <ChatContentSurface key={pathname}>
                  {children}
                </ChatContentSurface>
              </div>

              {/* Panels - side by side on desktop, overlay on mobile */}
              {!isMobile && isPanelOpen && (
                <div className={cn(
                  "relative z-10 flex-[0.55] h-full rounded-xl backdrop-blur-sm shadow-2xl overflow-hidden border",
                  "bg-white/50 border-zinc-200", // Light
                  "dark:bg-zinc-950/50 dark:border-zinc-800/50" // Dark
                )}>
                  {isExecutorOpen && <ExecutorPanel />}
                  {isProjectOpen && <ProjectPanel />}
                </div>
              )}
            </div>
          </div>

          {/* Mobile panels - full screen overlay */}
          {isMobile && isPanelOpen && (
            <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950">
              {isExecutorOpen && <ExecutorPanel />}
              {isProjectOpen && <ProjectPanel />}
            </div>
          )}
        </main>
      </div>
    </DataStreamProvider>
  );
}
