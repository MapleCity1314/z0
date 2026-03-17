import { UsersTable } from "@/components/admin/users/users-table";
import { loadAdminUsersPage } from "@/lib/admin/loaders";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const data = await loadAdminUsersPage(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage platform users</p>
      </div>

      <UsersTable
        users={data.users}
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
      />
    </div>
  );
}
