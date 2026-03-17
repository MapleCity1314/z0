import { UsersTable } from "@/components/admin/users/users-table";
import { apiFetch } from "@/lib/api";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { items, total, limit } = await apiFetch<{
    items: Array<{
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    limit: number;
    page: number;
  }>(`/v1/admin/users?page=${page}&limit=20`);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage platform users</p>
      </div>

      <UsersTable
        users={items.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }))}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
