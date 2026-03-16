import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { Loader } from "@/components/ai-elements/loader";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata.feedback();

export default async function FeedbackPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth");
  }

  return (
    <div className="h-full w-full bg-black flex flex-col overflow-hidden">
      {/* Header Area */}
      <div className="flex-none border-b border-zinc-800 bg-zinc-950/50 px-6 py-4 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-white tracking-tight">Feedback Center</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Help shape the future of Z0 Agent
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 p-4 lg:p-8">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-6">
            <div className="lg:sticky lg:top-8">
               <FeedbackForm />
               
               {/* Guidelines */}
               <div className="mt-6 hidden lg:block rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-500 space-y-2">
                 <p className="font-medium text-zinc-400">Guidelines:</p>
                 <ul className="list-disc list-inside space-y-1 ml-1">
                   <li>Be specific about bugs (steps to reproduce).</li>
                   <li>Check if a similar feature is already planned.</li>
                   <li>We review all feedback weekly.</li>
                 </ul>
               </div>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 mt-8 lg:mt-0">
             <div className="flex-none mb-4">
                <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">
                  Your Feedback History
                </h2>
             </div>
             
             <div className="flex-1 min-h-0">
                <Suspense 
                  fallback={
                    <div className="flex h-full items-center justify-center text-zinc-500 gap-2">
                      <Loader size={16} /> Loading history...
                    </div>
                  }
                >
                  <FeedbackList userId={session.user.id} />
                </Suspense>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
