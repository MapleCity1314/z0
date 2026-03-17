import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VersionsTable } from "@/components/admin/versions/versions-table";
import { apiFetch } from "@/lib/api";

export default async function VersionsPage() {
  const versions = await apiFetch<
    Array<{
      id: string;
      version: string;
      title: string;
      type: "major" | "minor" | "patch";
      status: "draft" | "published" | "archived";
      features: unknown[];
      improvements: unknown[];
      bugFixes: unknown[];
      isLatest: boolean;
      createdAt: string;
    }>
  >("/v1/admin/versions");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Versions</h1>
          <p className="text-muted-foreground">Manage version updates and changelogs</p>
        </div>
        <Button asChild>
          <Link href="/admin/versions/new">
            <Plus className="h-4 w-4 mr-2" />
            New Version
          </Link>
        </Button>
      </div>

      <VersionsTable
        versions={versions.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        }))}
      />
    </div>
  );
}
