import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VersionForm } from "@/components/admin/versions/version-form";

export default function NewVersionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/versions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Version</h1>
          <p className="text-muted-foreground">Create a new version update</p>
        </div>
      </div>

      <VersionForm />
    </div>
  );
}
