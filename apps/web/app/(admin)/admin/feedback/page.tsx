import { FeedbackTable } from "@/components/admin/feedback/feedback-table";
import { FeedbackStats } from "@/components/admin/feedback/feedback-stats";
import { loadAdminFeedbackPage } from "@/lib/admin/loaders";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    status?: string;
    priority?: string;
  }>;
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  const data = await loadAdminFeedbackPage(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">
          Manage user feedback and requests
        </p>
      </div>

      <FeedbackStats stats={data.stats} />

      <FeedbackTable feedback={data.feedback} />
    </div>
  );
}
