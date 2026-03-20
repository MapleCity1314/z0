"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@z0/ui/dialog";
import { Button } from "@z0/ui/button";
import { Input } from "@z0/ui/input";
import { Label } from "@z0/ui/label";
import { Textarea } from "@z0/ui/textarea";
import { toast } from "sonner";
import type { Project } from "@/lib/schema";
import { updateProjectMetadataAction } from "@/app/(chat)/api/projects/actions";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onProjectUpdated: (project: Project) => void;
}

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || "",
  });

  useEffect(() => {
    setFormData({
      name: project.name,
      description: project.description || "",
    });
  }, [project]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);

    const result = await updateProjectMetadataAction(project.id, {
      name: formData.name,
      description: formData.description || undefined,
      tags: project.tags as string[] | undefined,
    });

    if (result.success && result.data) {
      toast.success(result.message);
      onProjectUpdated(result.data);
    } else {
      toast.error(result.message);
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Project</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Update your project information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-zinc-300">
              Project Name
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="My Awesome Project"
              className="bg-zinc-950 border-zinc-800 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-zinc-300">
              Description (Optional)
            </Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe your project..."
              className="bg-zinc-950 border-zinc-800 text-white resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-white text-black hover:bg-zinc-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
