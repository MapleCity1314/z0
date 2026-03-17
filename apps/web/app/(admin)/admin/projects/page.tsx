import { ProjectsTable } from "@/components/admin/projects/projects-table";
import { apiFetch } from "@/lib/api";

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; status?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const query = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(params.type ? { type: params.type } : {}),
    ...(params.status ? { status: params.status } : {}),
  });
  const { items, total, limit } = await apiFetch<{
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      type: string;
      status: string;
      visibility: string;
      createdAt: string;
      updatedAt: string;
      userId: string;
      userName: string | null;
    }>;
    total: number;
    limit: number;
    page: number;
  }>(`/v1/admin/projects?${query.toString()}`);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">Manage user projects</p>
      </div>

      <ProjectsTable
        projects={items.map((item) => ({
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
