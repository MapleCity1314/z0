import { getAllFeedback } from "@/lib/db/feedback-queries";
import { getFeedbackStats } from "@/lib/db/admin-queries";
import { FeedbackTable } from "@/components/admin/feedback/feedback-table";
import { FeedbackStats } from "@/components/admin/feedback/feedback-stats";

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; status?: string; priority?: string }>;
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [feedbackList, stats] = await Promise.all([
    getAllFeedback({
      type: params.type,
      status: params.status,
      priority: params.priority,
    }),
    getFeedbackStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">Manage user feedback and requests</p>
      </div>

      <FeedbackStats stats={stats} />

      <FeedbackTable feedback={feedbackList} />
    </div>
  );
}
