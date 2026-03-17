import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, User, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeedbackActions } from "@/components/admin/feedback/feedback-actions";
import { loadAdminFeedbackDetail } from "@/lib/admin/loaders";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  reviewing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  planned: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const typeColors: Record<string, string> = {
  bug: "bg-red-500/10 text-red-500 border-red-500/20",
  feature: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  improvement: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  other: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const priorityColors: Record<string, string> = {
  low: "text-zinc-500",
  medium: "text-amber-500",
  high: "text-orange-500",
  critical: "text-red-500",
};

export default async function FeedbackDetailPage({ params }: PageProps) {
  const { id } = await params;
  const feedback = await loadAdminFeedbackDetail(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/feedback">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {feedback.title}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className={cn(typeColors[feedback.type])}>
              {feedback.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn(statusColors[feedback.status])}
            >
              {feedback.status}
            </Badge>
            <span
              className={cn(
                "text-sm font-medium capitalize",
                priorityColors[feedback.priority || "medium"],
              )}
            >
              {feedback.priority || "medium"} priority
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Feedback Content */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Description</h3>
            <p className="text-sm whitespace-pre-wrap">{feedback.content}</p>
          </div>

          {/* Admin Response */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Admin Response</h3>
            {feedback.adminResponse ? (
              <div>
                <p className="text-sm whitespace-pre-wrap">
                  {feedback.adminResponse}
                </p>
                {feedback.responder && (
                  <p className="text-xs text-muted-foreground mt-4">
                    Responded by {feedback.responder.name} on{" "}
                    {feedback.respondedAt &&
                      format(feedback.respondedAt, "MMM d, yyyy")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No response yet</p>
            )}
          </div>

          {/* Actions */}
          <FeedbackActions
            feedbackId={feedback.id}
            currentStatus={feedback.status}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Submitter */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Submitted by</h3>
            {feedback.submitter ? (
              <Link
                href={`/admin/users/${feedback.submitter.id}`}
                className="flex items-center gap-3 hover:bg-accent/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{feedback.submitter.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {feedback.submitter.email}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Unknown user</p>
            )}
          </div>

          {/* Details */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              {feedback.category && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Category</span>
                  <span>{feedback.category}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Created</span>
                <span>{format(feedback.createdAt, "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(feedback.updatedAt, "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
