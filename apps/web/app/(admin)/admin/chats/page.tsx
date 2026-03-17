import { ChatsTable } from "@/components/admin/chats/chats-table";
import { loadAdminChatsPage } from "@/lib/admin/loaders";

interface PageProps {
  searchParams: Promise<{ page?: string; userId?: string }>;
}

export default async function ChatsPage({ searchParams }: PageProps) {
  const data = await loadAdminChatsPage(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
        <p className="text-muted-foreground">View all conversations</p>
      </div>

      <ChatsTable
        chats={data.chats}
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
      />
    </div>
  );
}
