"use client";

import { Github, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { authClient } from "@/lib/auth-client";

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("GitHub sign in failed", error);
      toast.error("Failed to start GitHub sign in");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-6 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[-10%] top-[-10%] h-[40rem] w-[40rem] rounded-full bg-blue-500/20 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[42rem] w-[42rem] rounded-full bg-cyan-500/15 blur-[160px]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} className="text-white" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to z0</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Authentication is now handled by Better Auth with GitHub OAuth.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGithubSignIn}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white px-4 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Github className="size-5" />}
          Continue with GitHub
        </button>

        <p className="mt-6 text-center text-xs leading-6 text-zinc-500">
          Configure `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, and
          `GITHUB_CLIENT_SECRET` before using this flow.
        </p>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 w-full text-sm text-zinc-400 transition hover:text-white"
        >
          Back to app
        </button>
      </div>
    </div>
  );
}
