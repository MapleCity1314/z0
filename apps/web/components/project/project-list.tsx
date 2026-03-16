// components/project/project-list.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  FolderOpen,
  Clock,
  Eye,
  Heart,
  Lock,
  Search,
  Code2,
  Layout,
  Box,
  Terminal,
  Plus
} from "lucide-react";

import type { Project } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// --- Constants & Config ---

const STATUS_STYLES = {
  deployed: { label: "Deployed", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  building: { label: "Building", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", dot: "bg-yellow-500 animate-pulse" },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-500" },
  draft: { label: "Draft", color: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/20", dot: "bg-zinc-500" },
};

const TYPE_ICONS: Record<string, any> = {
  react: Code2,
  nextjs: Box,
  vue: Layout,
  node: Terminal,
  default: FolderOpen
};

export interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Status Filter
      if (filter !== "all" && project.status !== filter) return false;
      
      // Search Filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const tags = Array.isArray(project.tags) ? project.tags : [];
        return (
          project.name.toLowerCase().includes(q) ||
          project.description?.toLowerCase().includes(q) ||
          tags.some((t: string) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [projects, filter, searchQuery]);

  // Calculations for tabs counts
  const counts = useMemo(() => ({
    all: projects.length,
    draft: projects.filter(p => p.status === 'draft').length,
    deployed: projects.filter(p => p.status === 'deployed').length,
    failed: projects.filter(p => p.status === 'failed').length,
  }), [projects]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-0.5 h-9">
            <TabsTrigger value="all" className="text-xs px-3 h-8 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
              All <span className="ml-1.5 opacity-50">{counts.all}</span>
            </TabsTrigger>
            <TabsTrigger value="draft" className="text-xs px-3 h-8 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
              Draft <span className="ml-1.5 opacity-50">{counts.draft}</span>
            </TabsTrigger>
            <TabsTrigger value="deployed" className="text-xs px-3 h-8 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
              Deployed <span className="ml-1.5 opacity-50">{counts.deployed}</span>
            </TabsTrigger>
             <TabsTrigger value="failed" className="text-xs px-3 h-8 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
              Failed <span className="ml-1.5 opacity-50">{counts.failed}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input 
            placeholder="Search projects..." 
            className="pl-9 h-9 bg-zinc-900/50 border-zinc-800 text-zinc-200 focus-visible:ring-zinc-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState isSearch={!!searchQuery} />
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// --- Sub-Components ---

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const statusConfig = STATUS_STYLES[project.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.draft;
  const TypeIcon = TYPE_ICONS[project.type?.toLowerCase() as string] || TYPE_ICONS.default;
  const tags = Array.isArray(project.tags) ? project.tags : [];
  const views = typeof project.views === 'number' ? project.views : 0;
  const likes = typeof project.likes === 'number' ? project.likes : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/?projectId=${project.id}`} className="block h-full">
        <div className="group h-full relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-xl hover:shadow-black/20 backdrop-blur-sm cursor-pointer">
          
          {/* Top Row: Icon & Status */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 group-hover:text-white group-hover:border-zinc-700 transition-all">
              <TypeIcon className="size-5" />
            </div>

            <div className="flex items-center gap-2">
              <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-medium uppercase tracking-wider", statusConfig.bg, statusConfig.border, statusConfig.color)}>
                 <div className={cn("size-1.5 rounded-full", statusConfig.dot)} />
                 {statusConfig.label}
              </div>
            </div>
          </div>

          {/* Middle: Content */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">
                {project.name}
              </h3>
              {project.visibility === "private" && <Lock className="size-3 text-zinc-600" />}
            </div>
            
            <p className="text-sm text-zinc-400 line-clamp-2 h-10 leading-relaxed">
              {project.description || "No description provided."}
            </p>
          </div>

          {/* Bottom: Footer */}
          <div className="mt-auto space-y-4">
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] rounded bg-zinc-950 border border-zinc-800 text-zinc-500">
                    {tag}
                  </span>
                ))}
                {tags.length > 3 && (
                  <span className="px-1.5 py-0.5 text-[10px] text-zinc-600">+{tags.length - 3}</span>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-zinc-800/50 flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  <Eye className="size-3.5" />
                  <span>{views}</span>
                </div>
                <div className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                  <Heart className="size-3.5" />
                  <span>{likes}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyState({ isSearch }: { isSearch: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="col-span-full flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 mb-4">
        {isSearch ? <Search className="size-6 text-zinc-500" /> : <FolderOpen className="size-6 text-zinc-500" />}
      </div>
      <h3 className="text-lg font-medium text-zinc-200">
        {isSearch ? "No projects found" : "No projects yet"}
      </h3>
      <p className="text-sm text-zinc-500 mt-1 max-w-sm">
        {isSearch 
          ? "Try adjusting your search query to find what you're looking for." 
          : "Get started by creating your first project to organize your work."}
      </p>
      {!isSearch && (
        <Button asChild variant="outline" className="mt-4 border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
          <Link href="/?create=true">
            <Plus className="size-4 mr-2" /> Create Project
          </Link>
        </Button>
      )}
    </motion.div>
  );
}