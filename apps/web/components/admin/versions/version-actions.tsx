"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@z0/ui/button";
import {
  publishVersionAction,
  archiveVersionAction,
  deleteVersionAction,
} from "@/lib/admin/actions";
import { Rocket, Archive, Trash2 } from "lucide-react";

interface VersionActionsProps {
  versionId: string;
  currentStatus: string;
  isLatest: boolean;
}

export function VersionActions({
  versionId,
  currentStatus,
  isLatest,
}: VersionActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handlePublish = () => {
    startTransition(async () => {
      const result = await publishVersionAction(versionId);
      if (!result.success) {
        toast.error(result.message);
      }
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveVersionAction(versionId);
      if (!result.success) {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this version?")) return;

    startTransition(async () => {
      const result = await deleteVersionAction(versionId);
      if (result && !result.success) {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h3 className="font-semibold">Actions</h3>

      <div className="space-y-2">
        {currentStatus === "draft" && (
          <Button
            onClick={handlePublish}
            disabled={isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Publish Version
          </Button>
        )}

        {currentStatus === "published" && !isLatest && (
          <Button
            onClick={handleArchive}
            disabled={isPending}
            variant="outline"
            className="w-full"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive Version
          </Button>
        )}

        {currentStatus !== "published" && (
          <Button
            onClick={handleDelete}
            disabled={isPending}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Version
          </Button>
        )}
      </div>

      {isLatest && (
        <p className="text-xs text-muted-foreground text-center">
          This is the latest version and cannot be archived
        </p>
      )}
    </div>
  );
}
