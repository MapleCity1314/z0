import { Users, MessageSquare, FolderKanban, MessageCircle } from "lucide-react";
import { connection } from "next/server";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { ActivityFeed } from "@/components/admin/dashboard/activity-feed";
import {
  getDashboardStats,
  getRecentUsers,
  getRecentChats,
  getRecentFeedback,
} from "@/lib/db/admin-queries";

export default async function AdminDashboard() {
  await connection();

  const [stats, recentUsers, recentChats, recentFeedback] = await Promise.all([
    getDashboardStats(),
    getRecentUsers(5),
    getRecentChats(5),
    getRecentFeedback(5),
  ]);

  const userActivities = recentUsers.map((u) => ({
    id: u.id,
    type: "user" as const,
    title: u.name,
    subtitle: u.email,
    avatar: u.avatar,
    href: `/admin/users/${u.id}`,
    createdAt: u.createdAt,
  }));

  const chatActivities = recentChats.map((c) => ({
    id: c.id,
    type: "chat" as const,
    title: c.title,
    subtitle: c.userName || "Unknown user",
    href: `/admin/chats/${c.id}`,
    createdAt: c.createdAt,
  }));

  const feedbackActivities = recentFeedback.map((f) => ({
    id: f.id,
    type: "feedback" as const,
    title: f.title,
    subtitle: f.userName || "Unknown user",
    badge: {
      label: f.status,
      variant: f.status === "pending" ? "destructive" as const : "secondary" as const,
    },
    href: `/admin/feedback/${f.id}`,
    createdAt: f.createdAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.users.total}
          subtitle={`+${stats.users.today} today`}
          icon={Users}
          variant="info"
        />
        <StatCard
          title="Total Chats"
          value={stats.chats.total}
          subtitle={`+${stats.chats.today} today`}
          icon={MessageSquare}
          variant="success"
        />
        <StatCard
          title="Projects"
          value={stats.projects.total}
          subtitle={`${stats.projects.public} public`}
          icon={FolderKanban}
          variant="warning"
        />
        <StatCard
          title="Feedback"
          value={stats.feedback.total}
          subtitle={`${stats.feedback.pending} pending`}
          icon={MessageCircle}
          variant={stats.feedback.pending > 0 ? "danger" : "default"}
        />
      </div>

      {/* Activity Feeds */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ActivityFeed
          title="Recent Users"
          items={userActivities}
          emptyMessage="No users yet"
        />
        <ActivityFeed
          title="Recent Chats"
          items={chatActivities}
          emptyMessage="No chats yet"
        />
        <ActivityFeed
          title="Recent Feedback"
          items={feedbackActivities}
          emptyMessage="No feedback yet"
        />
      </div>
    </div>
  );
}
