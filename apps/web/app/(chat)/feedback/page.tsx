import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChatPageShell } from "@/components/chat/layout";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { getCurrentUser } from "@/lib/session";
import { apiFetch } from "@/lib/api";

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect("/auth");

  const items = await apiFetch<any[]>("/v1/feedback", {}, { actor: { userId: user.id } });

  return (
    <ChatPageShell innerClassName="mx-auto w-full max-w-7xl px-6 pb-8 pt-16 md:pb-12 md:pt-20">
        <header className="mb-16 text-center md:text-left">
          <h1 className="text-4xl font-medium tracking-tight text-zinc-950 dark:text-white md:text-6xl">
            Feedback <span className="text-zinc-500 dark:text-zinc-600">Hub</span>
          </h1>
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
            Collaborative intelligence growth
          </p>
        </header>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-12">
              <FeedbackForm />
              <div className="mt-8 px-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">Protocol</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  All submissions are reviewed weekly by the core intelligence team. We prioritize architectural improvements and critical bug fixes.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <h2 className="mb-6 ml-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Personal Log History
            </h2>
            <Suspense fallback={<div className="ml-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-500">Syncing logs...</div>}>
              <FeedbackList items={items || []} />
            </Suspense>
          </div>
        </div>
    </ChatPageShell>
  );
}
