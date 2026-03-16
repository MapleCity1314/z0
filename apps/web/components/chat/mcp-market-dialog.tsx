"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Server,
  Plus,
  Store,
  Settings2,
  Globe,
  Box,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  ConversationMcpServer,
  SystemMcpMarketItem,
} from "./integration-market-types";

type McpServerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mcpName: string;
  mcpEndpoint: string;
  onMcpNameChange: (value: string) => void;
  onMcpEndpointChange: (value: string) => void;
  onAddMcpServer: () => void;
  loading: boolean;
  servers: ConversationMcpServer[];
  marketServers: SystemMcpMarketItem[];
  onQuickAddFromMarket: (item: SystemMcpMarketItem) => Promise<void>;
  onServersChange: (nextServer: ConversationMcpServer) => Promise<void>;
};

// 市场来源的映射配置，用于展示更好看的标签
const sourceConfig = {
  all: { label: "全部", icon: Box },
  system: { label: "官方系统", icon: Server },
  market: { label: "社区市场", icon: Store },
  external: { label: "外部自定义", icon: Globe },
};

export function McpServerDialog({
  open,
  onOpenChange,
  mcpName,
  mcpEndpoint,
  onMcpNameChange,
  onMcpEndpointChange,
  onAddMcpServer,
  loading,
  servers,
  marketServers,
  onQuickAddFromMarket,
  onServersChange,
}: McpServerDialogProps) {
  const [marketQuery, setMarketQuery] = useState("");
  const [marketSource, setMarketSource] = useState<
    "all" | "system" | "market" | "external"
  >("all");
  // 用于移动端的 Tab 切换状态
  const [mobileTab, setMobileTab] = useState<"current" | "market">("market");

  const filteredMarketServers = useMemo(() => {
    const query = marketQuery.trim().toLowerCase();
    return marketServers.filter((item) => {
      const sourceMatched =
        marketSource === "all" ? true : item.sourceType === marketSource;
      const queryMatched =
        query.length === 0
          ? true
          : item.name.toLowerCase().includes(query) ||
            item.endpoint.toLowerCase().includes(query);
      return sourceMatched && queryMatched;
    });
  }, [marketQuery, marketServers, marketSource]);

  const groupedMarketServers = useMemo(() => {
    const groups: Record<string, SystemMcpMarketItem[]> = {
      system: [],
      market: [],
      external: [],
      other: [],
    };
    for (const item of filteredMarketServers) {
      if (item.sourceType === "system") groups.system.push(item);
      else if (item.sourceType === "market") groups.market.push(item);
      else if (item.sourceType === "external") groups.external.push(item);
      else groups.other.push(item);
    }
    return groups;
  }, [filteredMarketServers]);

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
        <DialogHeader className="shrink-0 border-b border-zinc-800 px-6 py-5 bg-zinc-950/50 backdrop-blur-xl">
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <Store className="h-6 w-6 text-blue-400" />
            MCP 扩展市场
          </DialogTitle>
          <DialogDescription className="mt-2 text-zinc-400">
            左侧是当前对话配置，右侧是系统市场。点击“一键添加”会同时加入当前对话和你的用户配置。
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
              当前对话配置 ({servers.length})
            </button>
            <button
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mobileTab === "market"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
              onClick={() => setMobileTab("market")}
            >
              MCP 市场
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
            {/* 添加外部 MCP */}
            <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-medium text-sm text-zinc-200">
                <Globe className="h-4 w-4 text-zinc-400" />
                添加外部 MCP
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={mcpName}
                  onChange={(event) => onMcpNameChange(event.target.value)}
                  placeholder="服务器名称 (如: Local Dev)"
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500"
                />
                <Input
                  value={mcpEndpoint}
                  onChange={(event) => onMcpEndpointChange(event.target.value)}
                  placeholder="https://example.com/mcp"
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={onAddMcpServer}
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
                <h3 className="flex items-center gap-2 font-medium text-sm text-zinc-200">
                  <Settings2 className="h-4 w-4 text-zinc-400" />
                  当前对话已关联
                </h3>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {servers.length} 项
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                  <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
                    <span className="animate-pulse">加载中...</span>
                  </div>
                ) : servers.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-zinc-500">
                    <LinkIcon className="h-8 w-8 text-zinc-700" />
                    <p>当前对话还没有关联任何 MCP</p>
                  </div>
                ) : (
                  servers.map((server) => (
                    <div
                      key={server.userMcpServerId}
                      className="group flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-sm text-zinc-100">
                            {server.name}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-400">
                          {server.endpoint}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-4 rounded-lg bg-zinc-950/50 p-2 sm:bg-transparent sm:p-0">
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300 hover:text-white">
                          <Switch
                            checked={server.useInCurrentChat}
                            onCheckedChange={(checked) =>
                              void onServersChange({
                                ...server,
                                useInCurrentChat: checked,
                              })
                            }
                          />
                          当前对话
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300 hover:text-white">
                          <Switch
                            checked={server.useByDefault}
                            onCheckedChange={(checked) =>
                              void onServersChange({
                                ...server,
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

          {/* 右侧：MCP 市场栏 */}
          <div
            className={cn(
              "flex min-h-0 flex-1 lg:flex-[1.2] flex-col gap-4 p-4 lg:p-5",
              mobileTab === "market" ? "flex" : "hidden lg:flex",
            )}
          >
            {/* 搜索与过滤 */}
            <div className="shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-zinc-200">
                  系统 MCP 市场
                </h3>
                <span className="text-xs text-zinc-500">
                  找到 {filteredMarketServers.length} / {marketServers.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={marketQuery}
                    onChange={(event) => setMarketQuery(event.target.value)}
                    placeholder="搜索名称或地址..."
                    className="border-zinc-800 bg-zinc-900/50 pl-9 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500"
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
                            ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
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
              ) : filteredMarketServers.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
                  <Search className="h-8 w-8 text-zinc-700" />
                  <p className="text-sm">没有匹配的 MCP</p>
                </div>
              ) : (
                <div className="space-y-6 pb-2">
                  {(["system", "market", "external", "other"] as const).map(
                    (groupKey) => {
                      const groupItems = groupedMarketServers[groupKey];
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
                            {groupItems.map((server) => (
                              <div
                                key={server.systemServerId}
                                className="group flex flex-col justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-all hover:border-blue-500/50 hover:bg-blue-500/5 sm:flex-row sm:items-center"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium text-sm text-zinc-200 group-hover:text-blue-100">
                                    {server.name}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-zinc-500 group-hover:text-blue-300/70">
                                    {server.endpoint}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="shrink-0 bg-white/5 text-zinc-300 hover:bg-blue-600 hover:text-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                                  onClick={() =>
                                    void onQuickAddFromMarket(server)
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
