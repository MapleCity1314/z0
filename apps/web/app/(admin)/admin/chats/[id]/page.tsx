import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatDetailPage({ params }: PageProps) {
  const { id } = await params;
  const chat = await apiFetch<{
    id: string;
    title: string;
    createdAt: string;
    userId: string;
    projectId: string | null;
    userName: string | null;
    messages: Array<{
      id: string;
      role: string;
      parts: unknown;
      attachments: unknown;
      createdAt: string;
    }>;
  }>(`/v1/admin/chats/${id}`).catch(() => null);

  if (!chat) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/chats">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight truncate">
            {chat.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {chat.userName || "Unknown"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(chat.createdAt), "MMM d, yyyy HH:mm")}
            </span>
            <Badge variant="secondary">{chat.messages.length} messages</Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-xl border bg-card">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Conversation</h3>
        </div>
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {chat.messages.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No messages in this conversation
            </div>
          ) : (
            chat.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "px-5 py-4",
                  msg.role === "assistant" && "bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={msg.role === "user" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {msg.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(msg.createdAt), "HH:mm:ss")}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {renderMessageContent(msg.parts)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function renderMessageContent(parts: unknown): string {
  if (!parts) return "";
  if (typeof parts === "string") return parts;
  if (Array.isArray(parts)) {
    return parts
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String(part.text);
        }
        return "";
      })
      .join("");
  }
  return JSON.stringify(parts, null, 2);
}
