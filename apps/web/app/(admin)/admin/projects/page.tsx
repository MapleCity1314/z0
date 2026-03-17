import { ProjectsTable } from "@/components/admin/projects/projects-table";
import { loadAdminProjectsPage } from "@/lib/admin/loaders";

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; status?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const data = await loadAdminProjectsPage(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">Manage user projects</p>
      </div>

      <ProjectsTable
        projects={data.projects}
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
      />
    </div>
  );
}
