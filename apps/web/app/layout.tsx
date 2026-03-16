import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/provider/theme-provider";
import { SessionProvider } from "@/components/provider/session-provider";
import { UserProvider } from "@/components/provider/user-provider";
import { Toaster } from "sonner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById } from "@/lib/db/queries";
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

async function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  let initialUser: { id: string; name: string | null; email: string; avatar: string | null } | null = null;

  if (session?.user?.id) {
    try {
      const user = await getUserById(session.user.id);
      if (user) {
        initialUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        };
      }
    } catch (error) {
      console.error("Failed to load user in layout:", error);
    }
  }

  return (
    <SessionProvider session={session}>
      <UserProvider initialUser={initialUser}>{children}</UserProvider>
    </SessionProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <AuthProvider>
            <ThemeProvider>
              {children as React.ReactNode}
              <Toaster position="top-center" richColors />
            </ThemeProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
