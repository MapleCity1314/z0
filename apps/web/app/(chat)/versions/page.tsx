import { Suspense } from "react";
import { VersionList } from "@/components/version/version-list";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { getPublishedVersionsAction } from "../api/version/actions";

export const metadata: Metadata = pageMetadata.versions();

export default async function VersionsPage() {
  const result = await getPublishedVersionsAction(20);
  const versions = result.success ? result.data : [];

  return (
    <div className="h-full w-full overflow-auto bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Version History</h1>
          <p className="text-sm text-zinc-400">
            See what's new in Z0 Agent
          </p>
        </div>

        {/* Version List */}
        <Suspense fallback={<div className="text-zinc-400">Loading...</div>}>
          <VersionList versions={versions || []} />
        </Suspense>
      </div>
    </div>
  );
}
