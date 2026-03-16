"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";
import { Loader } from "@/components/ai-elements/loader";
import { submitFeedbackAction } from "@/app/(chat)/api/feedback/actions";

export function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<"bug" | "feature" | "improvement" | "other">("feature");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFeedbackAction({
        type,
        category: category || undefined,
        title: title.trim(),
        content: content.trim(),
        priority: "medium",
        metadata: {
          browser: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });

      if (result.success) {
        toast.success("Feedback submitted successfully");
        setTitle("");
        setContent("");
        setCategory("");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      {/* Type Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Type</label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="bg-zinc-950 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="feature">Feature Request</SelectItem>
            <SelectItem value="improvement">Improvement</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Category (Optional)</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-zinc-950 border-zinc-800">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ui">UI/UX</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="ai">AI Models</SelectItem>
            <SelectItem value="deployment">Deployment</SelectItem>
            <SelectItem value="authentication">Authentication</SelectItem>
            <SelectItem value="chat">Chat</SelectItem>
            <SelectItem value="project">Project Management</SelectItem>
            <SelectItem value="executor">Code Executor</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary of your feedback"
          className="bg-zinc-950 border-zinc-800"
          required
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Description</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Provide detailed information..."
          className="bg-zinc-950 border-zinc-800 min-h-32"
          required
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-white text-black hover:bg-zinc-200"
      >
        {isSubmitting ? (
          <>
            <Loader size={16} />
            <span>Submitting...</span>
          </>
        ) : (
          "Submit Feedback"
        )}
      </Button>
    </form>
  );
}