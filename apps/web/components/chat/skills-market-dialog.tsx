"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import {
  Search,
  Zap,
  Plus,
  Store,
  Settings2,
  Folder,
  Box,
  Terminal,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@z0/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@z0/ui/dialog";
import { Input } from "@z0/ui/input";
import { Switch } from "@z0/ui/switch";
import { cn } from "@/lib/utils";
import type {
  ConversationSkill,
  SystemSkillMarketItem,
} from "@/lib/chat";

type SkillsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  skillDirectory: string;
  onSkillNameChange: (value: string) => void;
  onSkillDirectoryChange: (value: string) => void;
  onAddSkill: () => void;
  loading: boolean;
  skills: ConversationSkill[];
  marketSkills: SystemSkillMarketItem[];
  onQuickAddFromMarket: (item: SystemSkillMarketItem) => Promise<void>;
  onSkillsChange: (nextSkill: ConversationSkill) => Promise<void>;
};

// 市场来源的映射配置，用于展示更好看的标签
const sourceConfig = {
  all: { label: "全部", icon: Box },
  system: { label: "官方系统", icon: Terminal },
  market: { label: "社区市场", icon: Store },
  external: { label: "外部自定义", icon: Folder },
};

export function SkillsDialog({
  open,
  onOpenChange,
  skillName,
  skillDirectory,
  onSkillNameChange,
  onSkillDirectoryChange,
  onAddSkill,
  loading,
  skills,
  marketSkills,
  onQuickAddFromMarket,
  onSkillsChange,
}: SkillsDialogProps) {
  const [marketQuery, setMarketQuery] = useState("");
  const [marketSource, setMarketSource] = useState<
    "all" | "system" | "market" | "external"
  >("all");
  // 用于移动端的 Tab 切换状态
  const [mobileTab, setMobileTab] = useState<"current" | "market">("market");

  const filteredMarketSkills = useMemo(() => {
    const query = marketQuery.trim().toLowerCase();
    return marketSkills.filter((item) => {
      const sourceMatched =
        marketSource === "all" ? true : item.sourceType === marketSource;
      const queryMatched =
        query.length === 0
          ? true
          : item.name.toLowerCase().includes(query) ||
            item.directory.toLowerCase().includes(query);
      return sourceMatched && queryMatched;
    });
  }, [marketQuery, marketSkills, marketSource]);

  const groupedMarketSkills = useMemo(() => {
    const groups: Record<string, SystemSkillMarketItem[]> = {
      system: [],
      market: [],
      external: [],
      other: [],
    };
    for (const item of filteredMarketSkills) {
      if (item.sourceType === "system") groups.system.push(item);
      else if (item.sourceType === "market") groups.market.push(item);
      else if (item.sourceType === "external") groups.external.push(item);
      else groups.other.push(item);
    }
    return groups;
  }, [filteredMarketSkills]);

  const sourceOptions: Array<"all" | "system" | "market" | "external"> = [
    "all",
    "system",
    "market",
    "external",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0 shadow-2xl sm:h-[86vh] sm:!max-w-[96vw] xl:!max-w-[1440px]">
        {/* 头部区域 */}
        <DialogHeader className="shrink-0 border-b border-zinc-800 bg-zinc-950/50 px-6 py-5 backdrop-blur-xl">
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <Zap className="h-6 w-6 text-yellow-500" />
            Skills 技能市场
          </DialogTitle>
          <DialogDescription className="mt-2 text-zinc-400">
            左侧保存当前对话和用户级别的 Skill 配置，右侧是系统市场。运行时只会加载包含有效
            `SKILL.md` 的技能目录；点击“一键添加”仍会同时加入当前对话和你的用户配置。
          </DialogDescription>
        </DialogHeader>

        {/* 移动端专属 Tab 切换 (PC端隐藏) */}
        <div className="flex shrink-0 border-b border-zinc-800 p-2 lg:hidden">
          <div className="flex w-full rounded-lg bg-zinc-900/50 p-1">
            <button
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mobileTab === "current"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
              onClick={() => setMobileTab("current")}
            >
              当前对话配置 ({skills.length})
            </button>
            <button
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mobileTab === "market"
                  ? "bg-yellow-600/90 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
              onClick={() => setMobileTab("market")}
            >
              技能市场
            </button>
          </div>
        </div>

        {/* 主体内容区域 - PC双栏，移动端根据Tab显隐 */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* 左侧：当前配置栏 */}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-4 border-r border-zinc-800 bg-zinc-950/30 p-4 lg:p-5",
              mobileTab === "current" ? "flex" : "hidden lg:flex",
            )}
          >
            {/* 添加外部 Skill */}
            <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
                <Folder className="h-4 w-4 text-zinc-400" />
                添加外部 Skill
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={skillName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onSkillNameChange(event.target.value)
                  }
                  placeholder="技能名称 (如: My Script)"
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-yellow-500/50"
                />
                <Input
                  value={skillDirectory}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onSkillDirectoryChange(event.target.value)
                  }
                  placeholder=".agents/skills/my-skill"
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-yellow-500/50"
                />
                <Button
                  type="button"
                  onClick={onAddSkill}
                  className="shrink-0 bg-zinc-100 text-zinc-900 hover:bg-zinc-300 sm:w-auto"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  添加
                </Button>
              </div>
            </div>

            {/* 当前关联列表 */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/20">
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/40 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Settings2 className="h-4 w-4 text-zinc-400" />
                  当前对话已关联
                </h3>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {skills.length} 项
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
                    <span className="animate-pulse">加载中...</span>
                  </div>
                ) : skills.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-zinc-500">
                    <LinkIcon className="h-8 w-8 text-zinc-700" />
                    <p>当前对话还没有关联任何 Skill</p>
                  </div>
                ) : (
                  skills.map((skill) => (
                    <div
                      key={skill.userSkillId}
                      className="group flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-zinc-100">
                            {skill.name}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-400">
                          {skill.directory}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-4 rounded-lg bg-zinc-950/50 p-2 sm:bg-transparent sm:p-0">
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300 hover:text-white">
                          <Switch
                            checked={skill.useInCurrentChat}
                            onCheckedChange={(checked: boolean) =>
                              void onSkillsChange({
                                ...skill,
                                useInCurrentChat: checked,
                              })
                            }
                          />
                          当前对话
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300 hover:text-white">
                          <Switch
                            checked={skill.useByDefault}
                            onCheckedChange={(checked: boolean) =>
                              void onSkillsChange({
                                ...skill,
                                useByDefault: checked,
                              })
                            }
                          />
                          新对话默认
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右侧：Skill 市场栏 */}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-[1.2] lg:p-5",
              mobileTab === "market" ? "flex" : "hidden lg:flex",
            )}
          >
            {/* 搜索与过滤 */}
            <div className="shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200">
                  系统 Skills 市场
                </h3>
                <span className="text-xs text-zinc-500">
                  找到 {filteredMarketSkills.length} / {marketSkills.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={marketQuery}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setMarketQuery(event.target.value)
                    }
                    placeholder="搜索名称或目录..."
                    className="border-zinc-800 bg-zinc-900/50 pl-9 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-yellow-500/50"
                  />
                </div>

                {/* 来源过滤器 */}
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {sourceOptions.map((source) => {
                    const ConfigIcon = sourceConfig[source].icon;
                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() => setMarketSource(source)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                          marketSource === source
                            ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-500"
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                        )}
                      >
                        <ConfigIcon className="h-3.5 w-3.5" />
                        {sourceConfig[source].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 市场列表 */}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/20 p-3 shadow-inner">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  <span className="animate-pulse">加载中...</span>
                </div>
              ) : filteredMarketSkills.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
                  <Search className="h-8 w-8 text-zinc-700" />
                  <p className="text-sm">没有匹配的 Skill</p>
                </div>
              ) : (
                <div className="space-y-6 pb-2">
                  {(["system", "market", "external", "other"] as const).map(
                    (groupKey) => {
                      const groupItems = groupedMarketSkills[groupKey];
                      if (!groupItems || groupItems.length === 0) return null;

                      const groupLabel =
                        sourceConfig[groupKey as keyof typeof sourceConfig]
                          ?.label || "其他";

                      return (
                        <div key={groupKey} className="space-y-3">
                          <div className="sticky top-0 z-10 flex items-center gap-2 bg-zinc-950/90 py-1 backdrop-blur-md">
                            <p className="text-xs font-semibold tracking-wider text-zinc-500">
                              {groupLabel}
                            </p>
                            <div className="h-px flex-1 bg-zinc-800/50" />
                            <span className="text-[10px] text-zinc-600">
                              {groupItems.length}
                            </span>
                          </div>

                          <div className="grid gap-2 2xl:grid-cols-2">
                            {groupItems.map((skill) => (
                              <div
                                key={skill.systemSkillId}
                                className="group flex flex-col justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-all hover:border-yellow-500/50 hover:bg-yellow-500/5 sm:flex-row sm:items-center"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-yellow-100">
                                    {skill.name}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-zinc-500 group-hover:text-yellow-400/70">
                                    {skill.directory}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="shrink-0 bg-white/5 text-zinc-300 hover:bg-yellow-600 hover:text-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                                  onClick={() =>
                                    void onQuickAddFromMarket(skill)
                                  }
                                >
                                  <Plus className="mr-1 h-3.5 w-3.5" />
                                  一键添加
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
