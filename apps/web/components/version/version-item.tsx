// components/version/version-item.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { 
  Sparkles, 
  TrendingUp, 
  Bug, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  GitCommit,
  Rocket,
  Download,
  BookOpen,
  ArrowRight
} from "lucide-react";
import type { VersionUpdate } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VersionItemProps {
  version: VersionUpdate;
  defaultExpanded?: boolean;
  isLast?: boolean;
}

interface ChangelogItem {
  title: string;
  description?: string;
}

const TYPE_CONFIG = {
  major: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", label: "Major Update" },
  minor: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Minor Update" },
  patch: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Patch" },
};

export function VersionItem({ version, defaultExpanded = false, isLast }: VersionItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const features = (version.features as ChangelogItem[]) || [];
  const improvements = (version.improvements as ChangelogItem[]) || [];
  const bugFixes = (version.bugFixes as ChangelogItem[]) || [];
  const breaking = (version.breaking as ChangelogItem[]) || [];
  const highlights = (version.highlights as string[]) || [];

  const typeConfig = TYPE_CONFIG[version.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.patch;
  const isLatest = version.isLatest === "true";
  const dateObj = version.publishedAt ? new Date(version.publishedAt) : new Date();

  return (
    <div className="relative md:grid md:grid-cols-[160px_1fr] md:gap-8 group">
      {/* 1. Timeline Node (Left Column on Desktop) */}
      <div className="hidden md:flex flex-col items-end pt-1 pr-8 relative">
        <div className="text-sm font-semibold text-zinc-200 font-mono">
          v{version.version}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          {format(dateObj, "MMM d, yyyy")}
        </div>
        
        {/* Timeline Dot */}
        <div className={cn(
          "absolute right-[-5px] top-2 z-10 flex size-2.5 items-center justify-center rounded-full ring-4 ring-black transition-colors duration-300",
          isLatest ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-zinc-700 group-hover:bg-zinc-500"
        )} />
      </div>

      {/* 2. Content Card (Right Column) */}
      <div className="relative">
        {/* Mobile Timeline Line Adjustment */}
        <div className="absolute left-[-24px] top-2 size-3 rounded-full border-2 border-zinc-800 bg-zinc-950 md:hidden" />
        
        <div 
          className={cn(
            "rounded-xl border bg-zinc-900/40 backdrop-blur-sm transition-all duration-300 overflow-hidden",
            isExpanded ? "border-zinc-700 bg-zinc-900/60" : "border-zinc-800 hover:border-zinc-700"
          )}
        >
          {/* Card Header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-start gap-4 p-5 text-left"
          >
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Mobile Version Display */}
                <span className="md:hidden font-mono font-bold text-zinc-100 mr-2">
                  v{version.version}
                </span>

                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-normal", typeConfig.bg, typeConfig.color, typeConfig.border)}>
                   {typeConfig.label}
                </Badge>
                
                {isLatest && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-blue-500/10 text-blue-400 border-blue-500/20 flex items-center gap-1 animate-pulse">
                    <Rocket className="size-3" /> Latest
                  </Badge>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-semibold text-zinc-100 group-hover:text-white transition-colors">
                  {version.title}
                </h3>
                {version.description && (
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                    {version.description}
                  </p>
                )}
              </div>
            </div>

            <div className={cn(
              "flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-500 transition-transform duration-300",
              isExpanded && "rotate-180 bg-zinc-800 text-zinc-300"
            )}>
              <ChevronDown className="size-4" />
            </div>
          </button>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <div className="px-5 pb-6 pt-2 space-y-6 border-t border-zinc-800/50">
                  {/* Highlights Banner */}
                  {highlights.length > 0 && (
                    <div className="bg-gradient-to-r from-yellow-500/5 to-transparent border-l-2 border-yellow-500 pl-4 py-2">
                      <h4 className="text-xs font-semibold text-yellow-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                         <Sparkles className="size-3" /> Highlights
                      </h4>
                      <ul className="space-y-1">
                        {highlights.map((highlight, i) => (
                           <li key={i} className="text-sm text-zinc-200">
                             {highlight}
                           </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6">
                    {/* Breaking Changes */}
                    {breaking.length > 0 && (
                      <Section title="Breaking Changes" icon={AlertTriangle} color="text-red-400">
                         <ul className="space-y-3">
                          {breaking.map((item, i) => <ChangeItem key={i} item={item} />)}
                        </ul>
                      </Section>
                    )}

                    {/* Features */}
                    {features.length > 0 && (
                      <Section title="New Features" icon={Sparkles} color="text-blue-400">
                        <ul className="space-y-3">
                          {features.map((item, i) => <ChangeItem key={i} item={item} />)}
                        </ul>
                      </Section>
                    )}

                    {/* Improvements */}
                    {improvements.length > 0 && (
                      <Section title="Improvements" icon={TrendingUp} color="text-emerald-400">
                        <ul className="space-y-3">
                          {improvements.map((item, i) => <ChangeItem key={i} item={item} />)}
                        </ul>
                      </Section>
                    )}

                    {/* Bug Fixes */}
                    {bugFixes.length > 0 && (
                      <Section title="Bug Fixes" icon={Bug} color="text-purple-400">
                        <ul className="space-y-3">
                          {bugFixes.map((item, i) => <ChangeItem key={i} item={item} />)}
                        </ul>
                      </Section>
                    )}
                  </div>

                  {/* Footer Actions / Migration */}
                  {(version.migration || version.downloadUrl || version.docsUrl) && (
                    <div className="mt-6 pt-4 border-t border-zinc-800/50 flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
                       {version.migration && (
                          <div className="flex-1 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800">
                            <h4 className="text-xs font-semibold text-zinc-400 mb-1">Migration Guide</h4>
                            <p className="text-xs text-zinc-500 font-mono whitespace-pre-wrap">{version.migration}</p>
                          </div>
                       )}
                       
                       <div className="flex items-center gap-2 shrink-0">
                          {version.docsUrl && (
                            <a href={version.docsUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                              <BookOpen className="size-3.5" /> Docs
                            </a>
                          )}
                          {version.downloadUrl && (
                            <a href={version.downloadUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors">
                              <Download className="size-3.5" /> Download
                            </a>
                          )}
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- Sub-Components ---

function Section({ title, icon: Icon, color, children }: { title: string, icon: any, color: string, children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className={cn("text-xs font-semibold uppercase tracking-wider flex items-center gap-2", color)}>
        <Icon className="size-3.5" />
        {title}
      </h4>
      {children}
    </div>
  );
}

function ChangeItem({ item }: { item: ChangelogItem }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <div className="mt-1.5 size-1.5 rounded-full bg-zinc-700 shrink-0" />
      <div className="space-y-0.5">
        <span className="font-medium text-zinc-300 block">{item.title}</span>
        {item.description && (
          <p className="text-zinc-500 leading-relaxed text-xs">{item.description}</p>
        )}
      </div>
    </li>
  );
}