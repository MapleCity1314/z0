"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@z0/ui/select";
import { toast } from "sonner";
import { createProjectAction } from "@/app/(chat)/api/projects/actions";
import type { Project } from "@/lib/schema";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (project: Project) => void;
}

const PROJECT_TYPES = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "nextjs", label: "Next.js" },
  { value: "vanilla", label: "Vanilla" },
] as const;

type ProjectType = (typeof PROJECT_TYPES)[number]["value"];

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "react" as ProjectType,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);

    const result = await createProjectAction({
      name: formData.name,
      description: formData.description || undefined,
      type: formData.type,
    });

    if (result.success && result.data) {
      toast.success(result.message);
      onProjectCreated(result.data);
      setFormData({ name: "", description: "", type: "react" });
    } else {
      toast.error(result.message);
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Project</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Set up a new project to start building with AI assistance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">
              Project Name
            </Label>
            <Input
              id="name"
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
            <Label htmlFor="type" className="text-zinc-300">
              Project Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: ProjectType) =>
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
            <Label htmlFor="description" className="text-zinc-300">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
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
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
