"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { submitFeedbackAction } from "@/app/(chat)/api/feedback/actions";
import { GlassContainer, FormLabel } from "./shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FeedbackForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "feature" as const,
    title: "",
    content: "",
    category: "ui"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await submitFeedbackAction({
        ...formData,
        priority: "medium",
        metadata: { timestamp: new Date().toISOString() },
      });

      if (result.success) {
        toast.success("Feedback received");
        setFormData({ ...formData, title: "", content: "" });
      }
    } catch (error) {
      toast.error("Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassContainer className="border-white/10 bg-white/5">
      <header className="mb-8 flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          <Sparkles className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-medium text-white">Share Thoughts</h2>
          <p className="text-xs text-zinc-500">Influence the evolution of Z0</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormLabel>Type</FormLabel>
            <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
              <SelectTrigger className="h-12 rounded-full border-white/5 bg-white/5 px-6 text-zinc-300 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/10 bg-zinc-900/90 backdrop-blur-xl">
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <FormLabel>Category</FormLabel>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger className="h-12 rounded-full border-white/5 bg-white/5 px-6 text-zinc-300 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/10 bg-zinc-900/90 backdrop-blur-xl">
                <SelectItem value="ui">UI/UX</SelectItem>
                <SelectItem value="ai">AI Model</SelectItem>
                <SelectItem value="performance">Speed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <FormLabel>Title</FormLabel>
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="h-12 w-full rounded-full border border-white/5 bg-white/5 px-6 text-sm text-white outline-none transition-all focus:bg-white/10"
            placeholder="What's on your mind?"
          />
        </div>

        <div className="space-y-2">
          <FormLabel>Description</FormLabel>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="min-h-[120px] w-full rounded-[2rem] border border-white/5 bg-white/5 p-6 text-sm text-white outline-none transition-all focus:bg-white/10"
            placeholder="Tell us more..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="relative h-14 w-full overflow-hidden rounded-full bg-white font-bold uppercase tracking-widest text-black transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <AnimatePresence mode="wait">
            {isSubmitting ? (
              <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
                <Loader2 className="size-5 animate-spin" />
              </motion.div>
            ) : (
              <motion.span key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Submit</motion.span>
            )}
          </AnimatePresence>
        </button>
      </form>
    </GlassContainer>
  );
}