"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Tag, Star } from "lucide-react";
import { Badge } from "@z0/ui/badge";
import { DataTable } from "@/components/admin/data-table/data-table";
import { cn } from "@/lib/utils";
type VersionListItem = {
  id: string;
  version: string;
  title: string;
  type: "major" | "minor" | "patch";
  status: "draft" | "published" | "archived";
  features: unknown[];
  improvements: unknown[];
  bugFixes: unknown[];
  isLatest: boolean;
  createdAt: Date | string;
};

interface VersionsTableProps {
  versions: VersionListItem[];
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  published: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  archived: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const typeColors: Record<string, string> = {
  major: "bg-red-500/10 text-red-500 border-red-500/20",
  minor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  patch: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export function VersionsTable({ versions }: VersionsTableProps) {
  const router = useRouter();

  const columns = [
    {
      key: "version",
      title: "Version",
      render: (item: VersionListItem) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Tag className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">{item.version}</span>
            {item.isLatest && (
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            )}
          </div>
        </div>
      ),
    },
    {
      key: "title",
      title: "Title",
      render: (item: VersionListItem) => (
        <span className="truncate max-w-[200px]">{item.title}</span>
      ),
    },
    {
      key: "type",
      title: "Type",
      render: (item: VersionListItem) => (
        <Badge variant="outline" className={cn("text-xs", typeColors[item.type])}>
          {item.type}
        </Badge>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (item: VersionListItem) => (
        <Badge variant="outline" className={cn("text-xs", statusColors[item.status])}>
          {item.status}
        </Badge>
      ),
    },
    {
      key: "changes",
      title: "Changes",
      render: (item: VersionListItem) => {
        const features = (item.features as unknown[])?.length || 0;
        const improvements = (item.improvements as unknown[])?.length || 0;
        const bugFixes = (item.bugFixes as unknown[])?.length || 0;
        const total = features + improvements + bugFixes;
        return (
          <span className="text-muted-foreground">{total} changes</span>
        );
      },
    },
    {
      key: "createdAt",
      title: "Created",
      render: (item: VersionListItem) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={versions}
      keyField="id"
      onRowClick={(item) => router.push(`/admin/versions/${item.id}`)}
      emptyMessage="No versions found"
    />
  );
}
