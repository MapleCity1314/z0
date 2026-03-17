import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/provider/theme-provider";
import { SessionProvider } from "@/components/provider/session-provider";
import { UserProvider } from "@/components/provider/user-provider";
import { Toaster } from "sonner";
import { defaultMetadata } from "@/lib/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
