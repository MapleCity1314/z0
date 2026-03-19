import type { Metadata } from "next";
import { CustomizePage } from "@/components/customize/customize-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata.customize();

export default function Page() {
  return <CustomizePage />;
}
