"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Project } from "@/lib/schema";
import { updateProject } from "@/app/(chat)/api/project/actions";

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onProjectUpdated: (project: Project) => void;
}

const PROJECT_TYPES = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "nextjs", label: "Next.js" },
  { value: "angular", label: "Angular" },
  { value: "svelte", label: "Svelte" },
];

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
    type: project.type,
  });

  useEffect(() => {
    setFormData({
      name: project.name,
      description: project.description || "",
      type: project.type,
    });
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("type", formData.type);

    const result = await updateProject(project.id, data);

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
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="My Awesome Project"
              className="bg-zinc-950 border-zinc-800 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-type" className="text-zinc-300">
              Project Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {PROJECT_TYPES.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    className="text-white"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-zinc-300">
              Description (Optional)
            </Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) =>
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
