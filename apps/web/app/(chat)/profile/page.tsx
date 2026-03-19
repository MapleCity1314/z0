"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Loader2,
  LogOut,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChatPageShell } from "@/components/chat/page-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { updateProfile } from "./actions";

export default function ProfilePage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);

  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({ name: "", email: "", avatar: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    if (!user) return;
    setProfileData({
      name: user.name || "",
      email: user.email || "",
      avatar: user.avatar || "",
    });
    setAvatarPreview(user.avatar || "");
  }, [user]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB");
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const sessionUserId = session.data?.user?.id;
    if (!sessionUserId) return;

    setIsLoading(true);
    try {
      let avatarUrl = profileData.avatar;
      if (avatarFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", avatarFile);
        const uploadResponse = await fetch("/api/upload/avatar", { method: "POST", body: uploadFormData });
        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          toast.error(error.error || "Failed to upload avatar");
          return;
        }

        const uploadResult = await uploadResponse.json();
        avatarUrl = uploadResult.avatarUrl;
      }

      const formData = new FormData();
      formData.append("name", profileData.name);
      formData.append("avatar", avatarUrl);

      const result = await updateProfile(sessionUserId, formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Profile updated");
      setProfileData((current) => ({ ...current, avatar: avatarUrl }));
      setAvatarPreview(avatarUrl);
      updateUser({ name: profileData.name, avatar: avatarUrl });
      setAvatarFile(null);
    } catch (error) {
      toast.error("Update failed");
    } finally {
      setIsLoading(false);
    }
  };

  const initials = profileData.name.slice(0, 2).toUpperCase() || "U";

  return (
    <ChatPageShell>
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 md:mb-8">
            <button
              onClick={() => router.back()}
              className={cn(
                "group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                "border-zinc-200 bg-white/70 text-zinc-600 hover:bg-white hover:text-zinc-950",
                "dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                  "bg-zinc-100 text-zinc-500 group-hover:text-zinc-900",
                  "dark:bg-white/5 dark:text-zinc-400 dark:group-hover:text-white",
                )}
              >
                <ArrowLeft className="size-4" />
              </span>
              <span>Back</span>
            </button>
            <button
              onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/auth") } })}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors",
                "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
                "dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-300 dark:hover:bg-red-500/10",
              )}
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </button>
          </header>

          <section className="flex flex-1 items-start justify-center px-1 pb-2 pt-2 md:px-4 md:pb-4 md:pt-4">
            <div
              className={cn(
                "w-full max-w-3xl rounded-[1.75rem] border p-6 shadow-2xl backdrop-blur-xl md:p-8 lg:p-10",
                "border-zinc-200/80 bg-white/78",
                "dark:border-white/10 dark:bg-zinc-900/45",
              )}
            >
              <div className="mb-8 flex flex-col items-center gap-6 text-center md:mb-10 md:flex-row md:items-center md:text-left">
                <div className="group relative">
                  <Avatar className="size-24 border border-zinc-200 ring-4 ring-white/60 md:size-28 dark:border-white/10 dark:ring-white/5">
                    <AvatarImage src={avatarPreview} className="object-cover" />
                    <AvatarFallback className="bg-zinc-100 text-3xl font-light text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/35 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"
                  >
                    <Camera className="size-6 text-white" />
                  </label>
                  <input id="avatar-upload" type="file" onChange={handleAvatarChange} className="hidden" accept="image/*" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                    Profile
                  </p>
                  <h1 className="text-3xl font-medium tracking-tight text-zinc-950 dark:text-white">
                    {profileData.name || "Anonymous"}
                  </h1>
                  <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 md:justify-start">
                    <Mail className="size-3.5" />
                    <span className="text-sm">{profileData.email}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="ml-1 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    Display Name
                  </label>
                  <div className="group relative">
                    <User className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-700 dark:text-zinc-500 dark:group-focus-within:text-white" />
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className={cn(
                        "w-full rounded-2xl border py-4 pl-12 pr-4 text-sm outline-none transition-colors",
                        "border-zinc-200 bg-white/80 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white",
                        "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/20 dark:focus:bg-white/10",
                      )}
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div className="space-y-2 opacity-70">
                  <label className="ml-1 text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    Email Address
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className={cn(
                        "w-full cursor-not-allowed rounded-2xl border bg-transparent py-4 pl-12 pr-4 text-sm",
                        "border-zinc-200 text-zinc-500",
                        "dark:border-white/10 dark:text-zinc-500",
                      )}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl font-semibold transition-transform active:scale-[0.99] disabled:opacity-50",
                      "bg-zinc-950 text-white hover:bg-zinc-800",
                      "dark:bg-white dark:text-black dark:hover:bg-zinc-200",
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center justify-center"
                        >
                          <Loader2 className="size-5 animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.span key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          Update Profile
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                  <p className="mt-4 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-500">
                    Secured by GitHub Identity
                  </p>
                </div>
              </form>
            </div>
          </section>

          <footer className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-500 md:mt-6">
            &copy; {new Date().getFullYear()} Z0 Agent. All rights reserved.
          </footer>
    </ChatPageShell>
  );
}
