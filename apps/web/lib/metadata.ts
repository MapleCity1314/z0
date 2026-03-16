import type { Metadata } from "next";

// Base metadata configuration
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const appName = "z0 Agent";
const appDescription = "Multi-model AI chat application with intelligent conversations, code generation, web search, and file processing capabilities.";

export const defaultMetadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: appDescription,
  applicationName: appName,
  keywords: [
    "AI",
    "Chat",
    "Assistant",
    "GPT",
    "DeepSeek",
    "Qwen",
    "Gemini",
    "Code Generation",
    "Web Search",
    "Multi-model",
  ],
  authors: [{ name: "z0 Team" }],
  creator: "z0 Team",
  publisher: "z0 Team",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(baseUrl),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-pack/web/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-pack/web/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-pack/web/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    title: appName,
    description: appDescription,
    siteName: appName,
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: appDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Page-specific metadata generators
export const pageMetadata = {
  home: (): Metadata => ({
    title: "Home",
    description: "Start a new conversation with z0 Agent - your intelligent AI assistant.",
    openGraph: {
      title: `Home | ${appName}`,
      description: "Start a new conversation with z0 Agent - your intelligent AI assistant.",
    },
  }),

  chat: (title?: string): Metadata => {
    const chatTitle = title || "New Chat";
    return {
      title: chatTitle,
      description: `Chat conversation: ${chatTitle}`,
      openGraph: {
        title: `${chatTitle} | ${appName}`,
        description: `Chat conversation: ${chatTitle}`,
      },
    };
  },

  recent: (): Metadata => ({
    title: "Recent Chats",
    description: "View your recent chat conversations with z0 Agent.",
    openGraph: {
      title: `Recent Chats | ${appName}`,
      description: "View your recent chat conversations with z0 Agent.",
    },
  }),

  profile: (): Metadata => ({
    title: "Profile",
    description: "Manage your z0 Agent profile and settings.",
    openGraph: {
      title: `Profile | ${appName}`,
      description: "Manage your z0 Agent profile and settings.",
    },
  }),

  feedback: (): Metadata => ({
    title: "Feedback",
    description: "Share your feedback and help us improve z0 Agent.",
    openGraph: {
      title: `Feedback | ${appName}`,
      description: "Share your feedback and help us improve z0 Agent.",
    },
  }),

  versions: (): Metadata => ({
    title: "Version History",
    description: "See what's new in z0 Agent - latest updates, features, and improvements.",
    openGraph: {
      title: `Version History | ${appName}`,
      description: "See what's new in z0 Agent - latest updates, features, and improvements.",
    },
  }),

  auth: (): Metadata => ({
    title: "Sign In",
    description: "Sign in to your z0 Agent account to access your conversations.",
    openGraph: {
      title: `Sign In | ${appName}`,
      description: "Sign in to your z0 Agent account to access your conversations.",
    },
  }),

  project: (): Metadata => ({
    title: "Projects",
    description: "Manage your projects with z0 Agent.",
    openGraph: {
      title: `Projects | ${appName}`,
      description: "Manage your projects with z0 Agent.",
    },
  }),
};
