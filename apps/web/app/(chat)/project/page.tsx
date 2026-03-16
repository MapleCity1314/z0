// app/(app)/projects/page.tsx
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { getProjectsByUserId } from "@/lib/project/db/project-queries";
import { ProjectList } from "@/components/project/project-list";
import { Button } from "@/components/ui/button";


export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth");
  }

  const projects = await getProjectsByUserId(user.id);

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Background Decorator */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-zinc-800/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex h-full flex-col max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 flex-none">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white tracking-tight">My Projects</h1>
            <p className="text-sm text-zinc-400">
              Manage your deployments and development workspaces
            </p>
          </div>
          <Button asChild className="bg-white text-black hover:bg-zinc-200">
            <Link href="/?create=true">
              <Plus className="size-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4 pb-8 scrollbar-dark">
          <ProjectList projects={projects} />
        </div>
      </div>
    </div>
  );
}
