"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { FolderKanban, Globe, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table/data-table";
import { Pagination } from "@/components/admin/data-table/pagination";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  userName: string | null;
}

interface ProjectsTableProps {
  projects: Project[];
  page: number;
  totalPages: number;
  total: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  building: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  deployed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
};

const typeColors: Record<string, string> = {
  react: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  vue: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  nextjs: "bg-foreground/10 text-foreground border-foreground/20",
};

export function ProjectsTable({
  projects,
  page,
  totalPages,
  total,
}: ProjectsTableProps) {
  const router = useRouter();

  const columns = [
    {
      key: "name",
      title: "Project",
      render: (project: Project) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{project.name}</span>
              {project.visibility === "public" ? (
                <Globe className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                {project.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      title: "Type",
      render: (project: Project) => (
        <Badge
          variant="outline"
          className={cn("text-xs", typeColors[project.type])}
        >
          {project.type}
        </Badge>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (project: Project) => (
        <Badge
          variant="outline"
          className={cn("text-xs", statusColors[project.status])}
        >
          {project.status}
        </Badge>
      ),
    },
    {
      key: "user",
      title: "Owner",
      render: (project: Project) => (
        <span className="text-muted-foreground">
          {project.userName || "Unknown"}
        </span>
      ),
    },
    {
      key: "updatedAt",
      title: "Updated",
      render: (project: Project) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
        </span>
      ),
    },
  ];

  const handlePageChange = (newPage: number) => {
    router.push(`/admin/projects?page=${newPage}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} projects total</p>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        keyField="id"
        onRowClick={(project) => router.push(`/admin/projects/${project.id}`)}
        emptyMessage="No projects found"
      />

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
