import { cacheLife, cacheTag } from "next/cache";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: { icon: Circle, color: "text-zinc-500", bg: "bg-zinc-500/10 border-zinc-500/20" },
  reviewing: { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  planned: { icon: AlertCircle, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  completed: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

type FeedbackListItem = {
  id: string;
  type: string;
  category: string | null;
  title: string;
  content: string;
  status: string;
  adminResponse: string | null;
  createdAt: string;
};

export async function FeedbackList({ userId }: { userId: string }) {
  "use cache";
  cacheLife("minutes");
  cacheTag("user-feedback", `user-feedback-${userId}`);

  const items = await apiFetch<FeedbackListItem[]>(
    "/v1/feedback",
    { cache: "force-cache" },
    { actor: { userId } },
  );

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
          <Circle className="size-6 text-zinc-600" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-300">No feedback yet</p>
          <p className="text-xs text-zinc-500">Be the first to share your thoughts with us.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-4 pb-4">
        {items.map((feedback) => {
          const status =
            STATUS_CONFIG[feedback.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
          const StatusIcon = status.icon;

          return (
            <div
              key={feedback.id}
              className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div
                className={cn(
                  "absolute left-0 top-0 h-full w-1",
                  status.bg.replace("/10", "/40"),
                )}
              />

              <div className="space-y-3 pl-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-md border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs font-normal text-zinc-400"
                      >
                        {feedback.type}
                      </Badge>
                      {feedback.category ? (
                        <span className="text-xs text-zinc-500">- {feedback.category}</span>
                      ) : null}
                    </div>
                    <h3 className="text-sm font-medium leading-none text-zinc-100">
                      {feedback.title}
                    </h3>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "flex items-center gap-1.5 py-0.5 pl-1.5 pr-2.5",
                      status.bg,
                      status.color,
                    )}
                  >
                    <StatusIcon className="size-3.5" />
                    <span className="capitalize">{feedback.status}</span>
                  </Badge>
                </div>

                <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">
                  {feedback.content}
                </p>

                <div className="mt-1 flex items-center justify-between border-t border-zinc-800/50 pt-3">
                  <span className="font-mono text-xs text-zinc-500">
                    {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                  </span>

                  {feedback.adminResponse ? (
                    <div className="flex items-center gap-1.5 text-xs text-blue-400/80">
                      <MessageSquare className="size-3" />
                      <span>Responded</span>
                    </div>
                  ) : null}
                </div>

                {feedback.adminResponse ? (
                  <div className="mt-3 rounded-lg border border-zinc-800/60 bg-zinc-950 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-zinc-400">
                      <div className="size-1.5 rounded-full bg-blue-500" />
                      Team Response
                    </div>
                    <p className="text-sm text-zinc-300">{feedback.adminResponse}</p>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
