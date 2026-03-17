import { ChatsTable } from "@/components/admin/chats/chats-table";
import { apiFetch } from "@/lib/api";

interface PageProps {
  searchParams: Promise<{ page?: string; userId?: string }>;
}

export default async function ChatsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const query = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(params.userId ? { userId: params.userId } : {}),
  });
  const { items, total, limit } = await apiFetch<{
    items: Array<{
      id: string;
      title: string;
      createdAt: string;
      userId: string;
      projectId: string | null;
      userName: string | null;
      userEmail: string | null;
    }>;
    total: number;
    limit: number;
    page: number;
  }>(`/v1/admin/chats?${query.toString()}`);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
        <p className="text-muted-foreground">View all conversations</p>
      </div>

      <ChatsTable
        chats={items.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
        }))}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
