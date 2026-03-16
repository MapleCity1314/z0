import { getAllChats } from "@/lib/db/admin-queries";
import { ChatsTable } from "@/components/admin/chats/chats-table";

interface PageProps {
  searchParams: Promise<{ page?: string; userId?: string }>;
}

export default async function ChatsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { chats, total, limit } = await getAllChats({
    page,
    limit: 20,
    userId: params.userId,
  });
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
        <p className="text-muted-foreground">View all conversations</p>
      </div>

      <ChatsTable
        chats={chats}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
