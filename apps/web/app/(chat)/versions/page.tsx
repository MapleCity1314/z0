import type { Metadata } from "next";
import { ChatPageShell } from "@/components/chat/layout";
import { VersionsHeader } from "@/components/version/versions-header";
import { VersionList } from "@/components/version/version-list";
import { loadPublishedVersions } from "@/lib/app/loaders";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata.versions();

export default async function VersionsPage() {
  const versions = await loadPublishedVersions();

  return (
    <ChatPageShell>
      <VersionsHeader />

      <section className="mx-auto w-full max-w-5xl flex-1 px-3 md:px-6">
        <VersionList versions={versions} />
      </section>
    </ChatPageShell>
  );
}
