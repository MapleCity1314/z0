import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  MessageSquare,
  FolderKanban,
  MessageCircle,
  Brain,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@z0/ui/avatar";
import { Button } from "@z0/ui/button";
import { loadAdminUserDetail } from "@/lib/admin/loaders";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await loadAdminUserDetail(id);

  const statItems = [
    {
      label: "Chats",
      value: user.stats.chats,
      icon: MessageSquare,
      color: "text-blue-500",
    },
    {
      label: "Projects",
      value: user.stats.projects,
      icon: FolderKanban,
      color: "text-amber-500",
    },
    {
      label: "Feedback",
      value: user.stats.feedback,
      icon: MessageCircle,
      color: "text-emerald-500",
    },
    {
      label: "Memories",
      value: user.stats.memories,
      icon: Brain,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            User Details
          </h1>
          <p className="text-muted-foreground">
            View user information and activity
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info Card */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="text-xl">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>

              <div className="mt-6 w-full space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Joined</span>
                  <span>{format(user.createdAt, "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Last Active</span>
                  <span>
                    {formatDistanceToNow(user.updatedAt, { addSuffix: true })}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-xs">
                    {user.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {statItems.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border bg-card p-4 flex items-center gap-4"
              >
                <div className={`p-2.5 rounded-lg bg-muted ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/chats?userId=${user.id}`}>View Chats</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/projects?userId=${user.id}`}>
                  View Projects
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/feedback?userId=${user.id}`}>
                  View Feedback
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
