"use client";

import { useState, useEffect } from "react";
import { FolderOpen, Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Project } from "@/lib/schema";
import { getProjectsByUserId } from "@/app/(chat)/api/project/actions";

interface ProjectSelectorProps {
  selectedProjectId?: string | null;
  onProjectChange: (projectId: string | null) => void;
  children?: React.ReactNode;
}

export function ProjectSelector({
  selectedProjectId,
  onProjectChange,
  children,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      const result = await getProjectsByUserId();
      if (result.success && result.data) {
        setProjects(result.data);
      }
      setLoading(false);
    }
    loadProjects();
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-all",
              "border border-zinc-700/50 bg-zinc-800/80 text-zinc-300",
              "hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-700",
              selectedProjectId && "border-blue-500/50 bg-blue-500/10 text-blue-400"
            )}
          >
            <FolderOpen className="size-3.5" />
            <span className="max-w-[120px] truncate">
              {selectedProject?.name || "Select Project"}
            </span>
            <ChevronDown className="size-3" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 bg-zinc-900 border-zinc-800"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search projects..."
            className="h-9 text-zinc-100 placeholder:text-zinc-500"
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-zinc-500">
              {loading ? "Loading..." : "No projects found."}
            </CommandEmpty>
            <CommandGroup>
              {/* None option */}
              <CommandItem
                value="none"
                onSelect={() => {
                  onProjectChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer",
                  "aria-selected:bg-zinc-800 aria-selected:text-white",
                  !selectedProjectId && "bg-zinc-800 text-white"
                )}
              >
                <div className="flex size-5 items-center justify-center">
                  {!selectedProjectId && <Check className="size-4" />}
                </div>
                <span className="text-sm text-zinc-400">No Project</span>
              </CommandItem>

              {/* Project list */}
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => {
                    onProjectChange(project.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer",
                    "aria-selected:bg-zinc-800 aria-selected:text-white",
                    selectedProjectId === project.id && "bg-zinc-800 text-white"
                  )}
                >
                  <div className="flex size-5 items-center justify-center">
                    {selectedProjectId === project.id && (
                      <Check className="size-4" />
                    )}
                  </div>
                  <FolderOpen className="size-4 text-zinc-500" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{project.name}</div>
                    {project.description && (
                      <div className="truncate text-xs text-zinc-500">
                        {project.description}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// 项目标签组件 - 在 Header 中显示选中的项目
interface ProjectBadgeProps {
  selectedProjectId?: string | null;
  onRemove?: () => void;
}

export function ProjectBadge({ selectedProjectId, onRemove }: ProjectBadgeProps) {
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      return;
    }

    async function loadProject() {
      const result = await getProjectsByUserId();
      if (result.success && result.data) {
        const found = result.data.find((p) => p.id === selectedProjectId);
        setProject(found || null);
      }
    }
    loadProject();
  }, [selectedProjectId]);

  if (!project) return null;

  return (
    <div className="group relative flex h-9 items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-2.5 text-sm font-medium text-blue-400 transition-all hover:bg-blue-500/20">
      <FolderOpen className="size-4 shrink-0" />
      <span className="truncate max-w-[200px]">{project.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 flex size-4 items-center justify-center rounded-full text-blue-400 transition-colors hover:bg-blue-500/30 hover:text-blue-300"
          aria-label="Remove project"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

// 项目选择菜单项 - 集成到 "+" 按钮的下拉菜单中
interface ProjectSelectorMenuItemProps {
  selectedProjectId?: string | null;
  onProjectChange: (projectId: string | null) => void;
}

export function ProjectSelectorMenuItem({
  selectedProjectId,
  onProjectChange,
}: ProjectSelectorMenuItemProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      const result = await getProjectsByUserId();
      if (result.success && result.data) {
        setProjects(result.data);
      }
      setLoading(false);
    }
    loadProjects();
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-zinc-800 rounded-md">
          <FolderOpen className="size-4" />
          <span>{selectedProject?.name || "Select Project"}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 bg-zinc-900 border-zinc-800"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search projects..."
            className="h-9 text-zinc-100 placeholder:text-zinc-500"
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-zinc-500">
              {loading ? "Loading..." : "No projects found."}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => {
                  onProjectChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer",
                  "aria-selected:bg-zinc-800 aria-selected:text-white",
                  !selectedProjectId && "bg-zinc-800 text-white"
                )}
              >
                <div className="flex size-5 items-center justify-center">
                  {!selectedProjectId && <Check className="size-4" />}
                </div>
                <span className="text-sm text-zinc-400">No Project</span>
              </CommandItem>

              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => {
                    onProjectChange(project.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer",
                    "aria-selected:bg-zinc-800 aria-selected:text-white",
                    selectedProjectId === project.id && "bg-zinc-800 text-white"
                  )}
                >
                  <div className="flex size-5 items-center justify-center">
                    {selectedProjectId === project.id && (
                      <Check className="size-4" />
                    )}
                  </div>
                  <FolderOpen className="size-4 text-zinc-500" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm">{project.name}</div>
                    {project.description && (
                      <div className="truncate text-xs text-zinc-500">
                        {project.description}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
