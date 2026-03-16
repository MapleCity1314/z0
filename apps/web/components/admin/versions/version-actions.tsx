"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
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
      await publishVersionAction(versionId);
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      await archiveVersionAction(versionId);
    });
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this version?")) return;

    startTransition(async () => {
      await deleteVersionAction(versionId);
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
