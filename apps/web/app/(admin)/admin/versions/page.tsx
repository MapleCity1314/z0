import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VersionsTable } from "@/components/admin/versions/versions-table";
import { loadAdminVersionsPage } from "@/lib/admin/loaders";

export default async function VersionsPage() {
  const versions = await loadAdminVersionsPage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Versions</h1>
          <p className="text-muted-foreground">
            Manage version updates and changelogs
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/versions/new">
            <Plus className="h-4 w-4 mr-2" />
            New Version
          </Link>
        </Button>
      </div>

      <VersionsTable versions={versions} />
    </div>
  );
}
