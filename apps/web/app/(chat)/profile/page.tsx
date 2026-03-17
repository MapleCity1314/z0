"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Loader2, LogOut, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
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

        const uploadResponse = await fetch("/api/upload/avatar", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          toast.error(error.error || "Failed to upload avatar");
          setIsLoading(false);
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

      toast.success(result.message);
      setProfileData((current) => ({ ...current, avatar: avatarUrl }));
      setAvatarPreview(avatarUrl);
      updateUser({ name: profileData.name, avatar: avatarUrl });
      setAvatarFile(null);
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/auth") } });
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const initials = profileData.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-zinc-950 p-6 text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute left-[-10%] top-[-10%] h-[50vw] w-[50vw] rounded-full bg-blue-600/20 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -60, 0] }}
          transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] h-[60vw] w-[60vw] rounded-full bg-cyan-600/15 blur-[140px]"
        />
      </div>

      <div className="z-10 w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span className="text-sm">Back</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/40 shadow-2xl backdrop-blur-xl">
          <div className="p-8">
            <div className="mb-8 flex items-center gap-4">
              <div className="group relative">
                <Avatar className="size-20 border-2 border-white/10">
                  <AvatarImage src={avatarPreview || undefined} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Click to upload avatar"
                >
                  <Camera className="size-6" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{profileData.name || "User"}</h1>
                <p className="text-sm text-zinc-400">{profileData.email}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Account security is managed by your GitHub identity through Better Auth.
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 size-5 text-zinc-500" />
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(event) =>
                      setProfileData((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 px-10 py-3 text-sm text-zinc-100 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-5 text-zinc-500" />
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-zinc-700 bg-zinc-900/30 px-10 py-3 text-sm text-zinc-400"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">Email is sourced from GitHub and cannot be edited here.</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-medium text-black transition-all disabled:cursor-not-allowed disabled:opacity-70 hover:bg-zinc-200"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
