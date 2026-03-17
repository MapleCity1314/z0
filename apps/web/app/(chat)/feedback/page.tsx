import { Suspense } from "react";
import { redirect } from "next/navigation";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { Loader } from "@/components/ai-elements/loader";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = pageMetadata.feedback();

export default async function FeedbackPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/auth");
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-black">
      <div className="flex-none border-b border-zinc-800 bg-zinc-950/50 px-6 py-4 backdrop-blur-sm">
        <h1 className="text-xl font-semibold tracking-tight text-white">Feedback Center</h1>
        <p className="mt-1 text-sm text-zinc-400">Help shape the future of Z0 Agent</p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-1 gap-0 p-4 lg:grid-cols-12 lg:gap-8 lg:p-8">
          <div className="flex flex-col space-y-6 lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-8">
              <FeedbackForm />

              <div className="mt-6 hidden rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-500 lg:block">
                <p className="font-medium text-zinc-400">Guidelines:</p>
                <ul className="ml-1 list-inside list-disc space-y-1">
                  <li>Be specific about bugs (steps to reproduce).</li>
                  <li>Check if a similar feature is already planned.</li>
                  <li>We review all feedback weekly.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex min-h-0 flex-col lg:col-span-7 lg:mt-0 xl:col-span-8">
            <div className="mb-4 flex-none">
              <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-300">
                Your Feedback History
              </h2>
            </div>

            <div className="flex-1 min-h-0">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center gap-2 text-zinc-500">
                    <Loader size={16} /> Loading history...
                  </div>
                }
              >
                <FeedbackList userId={user.id} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
