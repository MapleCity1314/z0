import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Star, ExternalLink } from "lucide-react";
import { Button } from "@z0/ui/button";
import { Badge } from "@z0/ui/badge";
import { VersionActions } from "@/components/admin/versions/version-actions";
import { loadAdminVersionDetail } from "@/lib/admin/loaders";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ChangelogItem {
  title: string;
  description?: string;
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

export default async function VersionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const version = await loadAdminVersionDetail(id);

  const features = version.features || [];
  const improvements = version.improvements || [];
  const bugFixes = version.bugFixes || [];
  const breaking = version.breaking || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/versions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight font-mono">
              v{version.version}
            </h1>
            {version.isLatest && (
              <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className={cn(typeColors[version.type])}>
              {version.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn(statusColors[version.status])}
            >
              {version.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Description */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">{version.title}</h2>
            {version.description && (
              <p className="text-muted-foreground">{version.description}</p>
            )}
          </div>

          {/* Changelog */}
          <div className="rounded-xl border bg-card">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold">Changelog</h3>
            </div>
            <div className="p-5 space-y-6">
              {features.length > 0 && (
                <ChangelogSection
                  title="✨ Features"
                  items={features}
                  color="text-blue-500"
                />
              )}
              {improvements.length > 0 && (
                <ChangelogSection
                  title="🚀 Improvements"
                  items={improvements}
                  color="text-emerald-500"
                />
              )}
              {bugFixes.length > 0 && (
                <ChangelogSection
                  title="🐛 Bug Fixes"
                  items={bugFixes}
                  color="text-amber-500"
                />
              )}
              {breaking.length > 0 && (
                <ChangelogSection
                  title="⚠️ Breaking Changes"
                  items={breaking}
                  color="text-red-500"
                />
              )}
              {features.length === 0 &&
                improvements.length === 0 &&
                bugFixes.length === 0 &&
                breaking.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No changelog items yet
                  </p>
                )}
            </div>
          </div>

          {/* Migration Guide */}
          {version.migration && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-4">Migration Guide</h3>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
                {version.migration}
              </pre>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Created</span>
                <span>{format(version.createdAt, "MMM d, yyyy")}</span>
              </div>
              {version.publishedAt && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Published</span>
                  <span>{format(version.publishedAt, "MMM d, yyyy")}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(version.updatedAt, "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {(version.downloadUrl || version.docsUrl) && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold mb-4">Links</h3>
              <div className="space-y-2">
                {version.downloadUrl && (
                  <a
                    href={version.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Download
                  </a>
                )}
                {version.docsUrl && (
                  <a
                    href={version.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Documentation
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <VersionActions
            versionId={version.id}
            currentStatus={version.status}
            isLatest={version.isLatest}
          />
        </div>
      </div>
    </div>
  );
}

function ChangelogSection({
  title,
  items,
  color,
}: {
  title: string;
  items: ChangelogItem[];
  color: string;
}) {
  return (
    <div>
      <h4 className={cn("font-medium mb-3", color)}>{title}</h4>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm">
            <span className="font-medium">{item.title}</span>
            {item.description && (
              <p className="text-muted-foreground mt-0.5">{item.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
