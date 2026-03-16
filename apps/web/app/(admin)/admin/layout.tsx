import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";
import { AdminHeader } from "@/components/admin/layout/admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: 实现新的认证方式
  const user = {
    id: "",
    name: "Admin",
    email: "admin@example.com",
    avatar: null,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
