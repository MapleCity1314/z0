import { cn } from "@/lib/utils";

interface FeedbackStatsProps {
  stats: {
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
    byPriority: { priority: string | null; count: number }[];
  };
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500",
  reviewing: "bg-blue-500",
  planned: "bg-purple-500",
  completed: "bg-emerald-500",
  rejected: "bg-zinc-500",
};

const typeColors: Record<string, string> = {
  bug: "bg-red-500",
  feature: "bg-blue-500",
  improvement: "bg-emerald-500",
  other: "bg-zinc-500",
};

export function FeedbackStats({ stats }: FeedbackStatsProps) {
  const total = stats.byStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* By Status */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">By Status</h3>
        <div className="space-y-3">
          {stats.byStatus.map((item) => (
            <div key={item.status} className="flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full", statusColors[item.status])} />
              <span className="flex-1 text-sm capitalize">{item.status}</span>
              <span className="text-sm font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Type */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">By Type</h3>
        <div className="space-y-3">
          {stats.byType.map((item) => (
            <div key={item.type} className="flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full", typeColors[item.type])} />
              <span className="flex-1 text-sm capitalize">{item.type}</span>
              <span className="text-sm font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Total</span>
            <span className="text-2xl font-semibold">{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Pending</span>
            <span className="text-lg font-medium text-amber-500">
              {stats.byStatus.find((s) => s.status === "pending")?.count || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Completed</span>
            <span className="text-lg font-medium text-emerald-500">
              {stats.byStatus.find((s) => s.status === "completed")?.count || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
