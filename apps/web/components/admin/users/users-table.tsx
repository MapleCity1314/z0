"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@z0/ui/avatar";
import { DataTable } from "@/components/admin/data-table/data-table";
import { Pagination } from "@/components/admin/data-table/pagination";

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface UsersTableProps {
  users: User[];
  page: number;
  totalPages: number;
  total: number;
}

export function UsersTable({ users, page, totalPages, total }: UsersTableProps) {
  const router = useRouter();

  const columns = [
    {
      key: "user",
      title: "User",
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="text-xs">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Joined",
      render: (user: User) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: "updatedAt",
      title: "Last Active",
      render: (user: User) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const handlePageChange = (newPage: number) => {
    router.push(`/admin/users?page=${newPage}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} users total</p>
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyField="id"
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
        emptyMessage="No users found"
      />

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
