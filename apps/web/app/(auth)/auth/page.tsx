import AuthPage from "@/components/auth/auth";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata.auth();

export default function Page() {
  return <AuthPage />;
}
