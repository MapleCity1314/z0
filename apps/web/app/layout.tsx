import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import "@excalidraw/excalidraw/index.css";
import "./globals.css";
import { ThemeProvider } from "@/components/provider/theme-provider";
import { SessionProvider } from "@/components/provider/session-provider";
import { UserProvider } from "@/components/provider/user-provider";
import { Toaster } from "sonner";
import { defaultMetadata } from "@/lib/metadata";

const z0Sans = localFont({
  src: [
    {
      path: "../../../assets/brand/fonts/z0-sans-regular.woff2",
      style: "normal",
    },
    {
      path: "../../../assets/brand/fonts/z0-sans-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-z0-sans",
  display: "swap",
});

const z0Serif = localFont({
  src: [
    {
      path: "../../../assets/brand/fonts/z0-serif-regular.woff2",
      style: "normal",
    },
    {
      path: "../../../assets/brand/fonts/z0-serif-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-z0-serif",
  display: "swap",
});

const z0Mono = localFont({
  src: [
    {
      path: "../../../assets/brand/fonts/z0-mono-regular.woff2",
      style: "normal",
    },
    {
      path: "../../../assets/brand/fonts/z0-mono-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-z0-mono",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${z0Sans.variable} ${z0Serif.variable} ${z0Mono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <SessionProvider>
            <UserProvider initialUser={null}>
              <ThemeProvider>
                {children as React.ReactNode}
                <Toaster position="top-center" richColors />
              </ThemeProvider>
            </UserProvider>
          </SessionProvider>
        </Suspense>
      </body>
    </html>
  );
}
