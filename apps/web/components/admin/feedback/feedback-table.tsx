"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import { Badge } from "@z0/ui/badge";
import { DataTable } from "@/components/admin/data-table/data-table";
import { cn } from "@/lib/utils";

type FeedbackItem = {
  id: string;
  type: "bug" | "feature" | "improvement" | "other";
  category: string | null;
  title: string;
  status: "pending" | "reviewing" | "planned" | "completed" | "rejected";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: Date | string;
};

interface FeedbackTableProps {
  feedback: FeedbackItem[];
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  reviewing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  planned: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const typeColors: Record<string, string> = {
  bug: "bg-red-500/10 text-red-500 border-red-500/20",
  feature: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  improvement: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  other: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const priorityColors: Record<string, string> = {
  low: "text-zinc-500",
  medium: "text-amber-500",
  high: "text-orange-500",
  critical: "text-red-500",
};

export function FeedbackTable({ feedback }: FeedbackTableProps) {
  const router = useRouter();

  const columns = [
    {
      key: "title",
      title: "Feedback",
      render: (item: FeedbackItem) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium truncate max-w-[250px]">{item.title}</p>
            {item.category && (
              <p className="text-xs text-muted-foreground">{item.category}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      title: "Type",
      render: (item: FeedbackItem) => (
        <Badge variant="outline" className={cn("text-xs", typeColors[item.type])}>
          {item.type}
        </Badge>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (item: FeedbackItem) => (
        <Badge variant="outline" className={cn("text-xs", statusColors[item.status])}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      title: "Priority",
      render: (item: FeedbackItem) => (
        <span className={cn("text-sm font-medium capitalize", priorityColors[item.priority || "medium"])}>
          {item.priority || "medium"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Created",
      render: (item: FeedbackItem) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={feedback}
      keyField="id"
      onRowClick={(item) => router.push(`/admin/feedback/${item.id}`)}
      emptyMessage="No feedback found"
    />
  );
}
