"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { DataTable } from "@/components/admin/data-table/data-table";
import { Pagination } from "@/components/admin/data-table/pagination";

interface Chat {
  id: string;
  title: string;
  createdAt: Date | string;
  userId: string;
  projectId: string | null;
  userName: string | null;
  userEmail: string | null;
}

interface ChatsTableProps {
  chats: Chat[];
  page: number;
  totalPages: number;
  total: number;
}

export function ChatsTable({ chats, page, totalPages, total }: ChatsTableProps) {
  const router = useRouter();

  const columns = [
    {
      key: "title",
      title: "Title",
      render: (chat: Chat) => (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="max-w-[300px] truncate font-medium">{chat.title}</span>
        </div>
      ),
    },
    {
      key: "user",
      title: "User",
      render: (chat: Chat) => (
        <div>
          <p className="font-medium">{chat.userName || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{chat.userEmail}</p>
        </div>
      ),
    },
    {
      key: "project",
      title: "Project",
      render: (chat: Chat) => (
        <span className="text-muted-foreground">{chat.projectId ? "Linked" : "-"}</span>
      ),
    },
    {
      key: "createdAt",
      title: "Created",
      render: (chat: Chat) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const handlePageChange = (newPage: number) => {
    router.push(`/admin/chats?page=${newPage}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} chats total</p>
      </div>

      <DataTable
        columns={columns}
        data={chats}
        keyField="id"
        onRowClick={(chat) => router.push(`/admin/chats/${chat.id}`)}
        emptyMessage="No chats found"
      />

      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      ) : null}
    </div>
  );
}
