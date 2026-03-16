import { getAllProjects } from "@/lib/db/admin-queries";
import { ProjectsTable } from "@/components/admin/projects/projects-table";

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; status?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { projects, total, limit } = await getAllProjects({
    page,
    limit: 20,
    type: params.type,
    status: params.status,
  });
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">Manage user projects</p>
      </div>

      <ProjectsTable
        projects={projects}
        page={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
