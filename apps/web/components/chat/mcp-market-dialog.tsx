"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeInfo,
  Box,
  CalendarDays,
  Check,
  ExternalLink,
  Flame,
  FolderKanban,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  Link as LinkIcon,
  Mail,
  PenTool,
  Plus,
  Search,
  Server,
  Settings2,
  Store,
  type LucideIcon,
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
import {
  resolveServiceMarkKey,
  ServiceMark,
} from "@/components/integrations/service-mark";
import { cn } from "@/lib/utils";
import type {
  ConversationMcpServer,
  SystemMcpMarketItem,
} from "@/lib/chat";
import {
  filterSystemMcpMarketItems,
  groupSystemMcpMarketItems,
  isDirectSystemMcpMarketItem,
} from "@/lib/chat";

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
  warmState?: "idle" | "booting" | "ready" | "error";
  warmSummary?: string;
  warmStatuses?: Record<
    string,
    {
      state: "booting" | "ready" | "error";
      summary?: string;
    }
  >;
  marketServers: SystemMcpMarketItem[];
  onQuickAddFromMarket: (item: SystemMcpMarketItem) => Promise<void>;
  onServersChange: (nextServer: ConversationMcpServer) => Promise<void>;
};

const getWarmStatusKey = (server: { name: string; endpoint: string }) =>
  `${server.name}::${server.endpoint}`;

const sourceConfig = {
  all: { label: "All", icon: Box },
  system: { label: "System", icon: Server },
  market: { label: "Market", icon: Store },
  external: { label: "External", icon: Globe },
} as const;

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
  warmState = "idle",
  warmSummary = "",
  warmStatuses = {},
  marketServers,
  onQuickAddFromMarket,
  onServersChange,
}: McpServerDialogProps) {
  const [marketQuery, setMarketQuery] = useState("");
  const [marketSource, setMarketSource] = useState<
    "all" | "system" | "market" | "external"
  >("all");
  const [mobileTab, setMobileTab] = useState<"current" | "market">("market");

  const filteredMarketServers = useMemo(
    () =>
      filterSystemMcpMarketItems(marketServers, {
        query: marketQuery,
        source: marketSource,
      }),
    [marketQuery, marketServers, marketSource],
  );

  const groupedMarketServers = useMemo(
    () => groupSystemMcpMarketItems(filteredMarketServers),
    [filteredMarketServers],
  );

  const sourceOptions: Array<"all" | "system" | "market" | "external"> = [
    "all",
    "system",
    "market",
    "external",
  ];
  const connectedServerIds = useMemo(
    () =>
      new Set(
        servers
          .filter((server) => server.authStatus === "connected")
          .map((server) => server.systemServerId),
      ),
    [servers],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-0 shadow-2xl sm:h-[86vh] sm:!max-w-[96vw] xl:!max-w-[1440px]">
        <DialogHeader className="shrink-0 border-zinc-800 border-b bg-zinc-950/50 px-6 py-5 backdrop-blur-xl">
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <Store className="h-6 w-6 text-blue-400" />
            MCP Servers
          </DialogTitle>
          <DialogDescription className="mt-2 text-zinc-400">
            The left side stores MCP server links for this chat and your
            account. The right side shows the shared MCP registry. Runtime
            availability is separate from saved config, so a linked server is
            only usable after the MCP runtime connects and warms successfully.
          </DialogDescription>
          {warmState !== "idle" && warmSummary ? (
            <p
              className={cn(
                "mt-2 text-xs",
                warmState === "booting"
                  ? "text-amber-300"
                  : warmState === "ready"
                    ? "text-emerald-300"
                    : "text-rose-300",
              )}
            >
              {warmSummary}
            </p>
          ) : null}
        </DialogHeader>

        <div className="flex shrink-0 border-zinc-800 border-b p-2 lg:hidden">
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
              Current chat ({servers.length})
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
              MCP market
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-4 border-zinc-800 border-r bg-zinc-950/30 p-4 lg:p-5",
              mobileTab === "current" ? "flex" : "hidden lg:flex",
            )}
          >
            <div className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-medium text-sm text-zinc-200">
                <Globe className="h-4 w-4 text-zinc-400" />
                Add external MCP
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={mcpName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onMcpNameChange(event.target.value)
                  }
                  placeholder="Server name"
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500"
                />
                <Input
                  value={mcpEndpoint}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onMcpEndpointChange(event.target.value)
                  }
                  placeholder="https://example.com/mcp"
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500"
                />
                <Button
                  type="button"
                  onClick={onAddMcpServer}
                  className="shrink-0 bg-zinc-100 text-zinc-900 hover:bg-zinc-300 sm:w-auto"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/20">
              <div className="flex shrink-0 items-center justify-between border-zinc-800 border-b bg-zinc-900/40 px-4 py-3">
                <h3 className="flex items-center gap-2 font-medium text-sm text-zinc-200">
                  <Settings2 className="h-4 w-4 text-zinc-400" />
                  Linked to this chat
                </h3>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {servers.length} items
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
                    <span className="animate-pulse">Loading...</span>
                  </div>
                ) : servers.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-zinc-500">
                    <LinkIcon className="h-8 w-8 text-zinc-700" />
                    <p>No MCP servers are linked to this chat yet.</p>
                  </div>
                ) : (
                  servers.map((server) => {
                    const serviceKey = resolveServiceMarkKey(
                      server.name,
                      server.endpoint,
                    );

                    return (
                      <div
                        key={server.userMcpServerId}
                        className="group flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {serviceKey ? (
                            <ServiceMark
                              serviceKey={serviceKey}
                              className="size-10 shrink-0 rounded-xl"
                              svgClassName="size-4"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium text-sm text-zinc-100">
                                {server.name}
                              </p>
                              {(() => {
                                const warmStatus =
                                  warmStatuses[getWarmStatusKey(server)];

                                if (!warmStatus) {
                                  return null;
                                }

                                return (
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
                                      warmStatus.state === "booting"
                                        ? "bg-amber-500/15 text-amber-300"
                                        : warmStatus.state === "ready"
                                          ? "bg-emerald-500/15 text-emerald-300"
                                          : "bg-rose-500/15 text-rose-300",
                                    )}
                                  >
                                    {warmStatus.state}
                                  </span>
                                );
                              })()}
                            </div>
                            <p className="mt-1 truncate text-xs text-zinc-400">
                              {server.endpoint}
                            </p>
                            {(() => {
                              const warmStatus =
                                warmStatuses[getWarmStatusKey(server)];

                              if (!warmStatus?.summary) {
                                return null;
                              }

                              return (
                                <p
                                  className={cn(
                                    "mt-1 truncate text-[11px]",
                                    warmStatus.state === "booting"
                                      ? "text-amber-300"
                                      : warmStatus.state === "ready"
                                        ? "text-emerald-300"
                                        : "text-rose-300",
                                  )}
                                >
                                  {warmStatus.summary}
                                </p>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-4 rounded-lg bg-zinc-950/50 p-2 sm:bg-transparent sm:p-0">
                          <div className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white">
                            <Switch
                              checked={server.useInCurrentChat}
                              onCheckedChange={(checked: boolean) =>
                                void onServersChange({
                                  ...server,
                                  useInCurrentChat: checked,
                                })
                              }
                            />
                            Current chat
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-300 hover:text-white">
                            <Switch
                              checked={server.useByDefault}
                              onCheckedChange={(checked: boolean) =>
                                void onServersChange({
                                  ...server,
                                  useByDefault: checked,
                                })
                              }
                            />
                            Default for new chats
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-[1.2] lg:p-5",
              mobileTab === "market" ? "flex" : "hidden lg:flex",
            )}
          >
            <div className="shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-zinc-200">
                  Shared MCP registry
                </h3>
                <span className="text-xs text-zinc-500">
                  {filteredMarketServers.length} / {marketServers.length}
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
                    placeholder="Search by name or endpoint..."
                    className="border-zinc-800 bg-zinc-900/50 pl-9 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500"
                  />
                </div>

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

            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/20 p-3 shadow-inner">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  <span className="animate-pulse">Loading...</span>
                </div>
              ) : filteredMarketServers.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
                  <Search className="h-8 w-8 text-zinc-700" />
                  <p className="text-sm">No matching MCP servers.</p>
                </div>
              ) : (
                <div className="space-y-6 pb-2">
                  {(["system", "market", "external", "other"] as const).map(
                    (groupKey) => {
                      const categories = Object.entries(
                        groupedMarketServers[groupKey],
                      );
                      if (categories.length === 0) {
                        return null;
                      }

                      const groupLabel =
                        sourceConfig[groupKey as keyof typeof sourceConfig]
                          ?.label || "Other";

                      return (
                        <div key={groupKey} className="space-y-3">
                          <div className="sticky top-0 z-10 flex items-center gap-2 bg-zinc-950/90 py-1 backdrop-blur-md">
                            <p className="text-xs font-semibold tracking-wider text-zinc-500">
                              {groupLabel}
                            </p>
                            <div className="h-px flex-1 bg-zinc-800/50" />
                            <span className="text-[10px] text-zinc-600">
                              {categories.reduce(
                                (count, [, items]) => count + items.length,
                                0,
                              )}
                            </span>
                          </div>

                          <div className="space-y-4">
                            {categories.map(([category, servers]) => (
                              <div key={`${groupKey}-${category}`} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400">
                                    {category}
                                  </span>
                                  <div className="h-px flex-1 bg-zinc-800/40" />
                                </div>
                                <div className="grid gap-2 2xl:grid-cols-2">
                                  {servers.map((server) => (
                                    <MarketServerCard
                                      key={server.systemServerId}
                                      server={server}
                                      isConnected={connectedServerIds.has(
                                        server.systemServerId,
                                      )}
                                      onQuickAddFromMarket={onQuickAddFromMarket}
                                    />
                                  ))}
                                </div>
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

const marketIcons: Record<string, LucideIcon> = {
  excalidraw: PenTool,
  notion: FolderKanban,
  github: GitBranch,
  gmail: Mail,
  "google-calendar": CalendarDays,
  "google-drive": HardDrive,
  figma: PenTool,
};

function MarketServerCard({
  server,
  isConnected,
  onQuickAddFromMarket,
}: {
  server: SystemMcpMarketItem;
  isConnected: boolean;
  onQuickAddFromMarket: (item: SystemMcpMarketItem) => Promise<void>;
}) {
  const serviceKey = resolveServiceMarkKey(
    server.icon,
    server.slug,
    server.name,
    server.provider,
  );
  const Icon = marketIcons[server.icon] ?? BadgeInfo;
  const canQuickAdd = server.requiresAuth || isDirectSystemMcpMarketItem(server);

  return (
    <div className="group flex flex-col justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 transition-all hover:border-blue-500/50 hover:bg-blue-500/5">
      <div className="flex items-start gap-3">
        {serviceKey ? (
          <ServiceMark serviceKey={serviceKey} className="size-11 shrink-0 rounded-xl" svgClassName="size-4.5" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-200">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-sm text-zinc-200 group-hover:text-blue-100">
              {server.name}
            </p>
            {server.recommended ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                <Flame className="h-3 w-3" />
                Recommended
              </span>
            ) : null}
            {server.requiresSetup ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                <KeyRound className="h-3 w-3" />
                Setup
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                <Check className="h-3 w-3" />
                Direct
              </span>
            )}
            {isConnected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                <Check className="h-3 w-3" />
                Connected
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-400">{server.shortDescription}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <MarketTag label={server.provider} />
            <MarketTag label={server.category} />
            {server.tags.slice(0, 3).map((tag) => (
              <MarketTag key={`${server.systemServerId}-${tag}`} label={tag} />
            ))}
          </div>
          <p className="mt-2 truncate text-[11px] text-zinc-500 group-hover:text-blue-300/70">
            {server.endpoint}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-500">{server.setupLabel}</span>
        <div className="flex items-center gap-2">
          {server.docsUrl ? (
            <Button
              asChild
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              <Link href={server.docsUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                Docs
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canQuickAdd}
            className="shrink-0 bg-white/5 text-zinc-300 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-900 disabled:text-zinc-600"
            onClick={() => void onQuickAddFromMarket(server)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {server.requiresAuth
              ? isConnected
                ? "Reconnect"
                : "Connect"
              : "Quick add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MarketTag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-0.5 text-[10px] text-zinc-400">
      {label}
    </span>
  );
}
