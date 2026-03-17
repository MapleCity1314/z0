import { FeedbackTable } from "@/components/admin/feedback/feedback-table";
import { FeedbackStats } from "@/components/admin/feedback/feedback-stats";
import { apiFetch } from "@/lib/api";

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; status?: string; priority?: string }>;
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [feedbackList, stats] = await Promise.all([
    apiFetch<
      Array<{
        id: string;
        userId: string;
        type: "bug" | "feature" | "improvement" | "other";
        category: string | null;
        title: string;
        content: string;
        status: "pending" | "reviewing" | "planned" | "completed" | "rejected";
        priority: "low" | "medium" | "high" | "critical";
        adminResponse: string | null;
        createdAt: string;
        updatedAt: string;
      }>
    >(
      `/v1/admin/feedback?${new URLSearchParams({
        ...(params.type ? { type: params.type } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.priority ? { priority: params.priority } : {}),
      }).toString()}`,
    ),
    apiFetch<{
      byStatus: Array<{ status: string | null; count: number }>;
      byType: Array<{ type: string | null; count: number }>;
      byPriority: Array<{ priority: string | null; count: number }>;
    }>("/v1/admin/feedback/stats"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground">Manage user feedback and requests</p>
      </div>

      <FeedbackStats stats={stats} />

      <FeedbackTable
        feedback={feedbackList.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }))}
      />
    </div>
  );
}
