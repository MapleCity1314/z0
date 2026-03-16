import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata.profile();

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
