import { getAllUsers } from "@/lib/db/admin-queries";
import { UsersTable } from "@/components/admin/users/users-table";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { users, total, limit } = await getAllUsers({ page, limit: 20 });
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage platform users</p>
      </div>

      <UsersTable
        users={users}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
