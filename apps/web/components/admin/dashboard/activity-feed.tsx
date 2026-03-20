import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@z0/ui/avatar";
import { Badge } from "@z0/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: "user" | "chat" | "feedback";
  title: string;
  subtitle?: string;
  avatar?: string | null;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  href: string;
  createdAt: Date;
}

interface ActivityFeedProps {
  title: string;
  items: ActivityItem[];
  emptyMessage?: string;
}

export function ActivityFeed({
  title,
  items,
  emptyMessage = "No recent activity",
}: ActivityFeedProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={item.avatar || undefined} />
                <AvatarFallback className="text-xs bg-muted">
                  {item.title.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.badge && (
                  <Badge
                    variant={item.badge.variant || "secondary"}
                    className="text-[10px] px-1.5"
                  >
                    {item.badge.label}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
