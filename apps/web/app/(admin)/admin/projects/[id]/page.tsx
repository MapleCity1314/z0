import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, User, Calendar, Globe, Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProjectById } from "@/lib/project/db/project-queries";
import { getUserById } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  building: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  deployed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const owner = await getUserById(project.userId);
  const files = project.files as Record<string, string>;
  const fileCount = Object.keys(files).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            {project.visibility === "public" ? (
              <Globe className="h-5 w-5 text-emerald-500" />
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {project.description || "No description"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Project Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-semibold">Project Info</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="outline">{project.type}</Badge>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={cn(statusColors[project.status])}>
                  {project.status}
                </Badge>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Files</span>
                <span>{fileCount}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Created</span>
                <span>{format(project.createdAt, "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(project.updatedAt, "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>

          {/* Owner */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Owner</h3>
            {owner ? (
              <Link
                href={`/admin/users/${owner.id}`}
                className="flex items-center gap-3 hover:bg-accent/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{owner.name}</p>
                  <p className="text-xs text-muted-foreground">{owner.email}</p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Unknown user</p>
            )}
          </div>

          {/* Deployment */}
          {project.deploymentUrl && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-4">Deployment</h3>
              <a
                href={project.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {project.deploymentUrl}
              </a>
              {project.deploymentProvider && (
                <p className="text-xs text-muted-foreground mt-2">
                  via {project.deploymentProvider}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Files */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Files ({fileCount})</h3>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {fileCount === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No files in this project
                </div>
              ) : (
                Object.keys(files).map((path) => (
                  <div key={path} className="px-5 py-3">
                    <p className="font-mono text-sm">{path}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {files[path].length.toLocaleString()} characters
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
