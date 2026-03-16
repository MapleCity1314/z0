"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Lock, Mail, Loader2, Camera, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { useUserStore } from "@/store/user";
import { updateProfile, updatePassword } from "./actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    avatar: "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
      setAvatarPreview(user.avatar || "");
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed");
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File too large. Maximum size is 5MB");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setIsLoading(true);

    try {
      let avatarUrl = profileData.avatar;

      // Upload avatar if a new file is selected
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

      // Update profile with new data
      const formData = new FormData();
      formData.append("name", profileData.name);
      formData.append("avatar", avatarUrl);

      const result = await updateProfile(session.user.id, formData);

      if (result.success) {
        toast.success(result.message);
        // Update local state and store
        setProfileData({ ...profileData, avatar: avatarUrl });
        setAvatarPreview(avatarUrl);
        updateUser({ name: profileData.name, avatar: avatarUrl });
        setAvatarFile(null);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("currentPassword", passwordData.currentPassword);
    formData.append("newPassword", passwordData.newPassword);
    formData.append("confirmPassword", passwordData.confirmPassword);

    const result = await updatePassword(session.user.id, formData);
    setIsLoading(false);

    if (result.success) {
      toast.success(result.message);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } else {
      toast.error(result.message);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/auth" });
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950 text-white p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -60, 0],
          }}
          transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-600/15 rounded-full blur-[140px]"
        />
      </div>

      <div className="z-10 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="text-sm">Back</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </button>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative group">
                <Avatar className="size-20 border-2 border-white/10">
                  <AvatarImage src={avatarPreview || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profileData.name ? getInitials(profileData.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
                {avatarFile && (
                  <p className="text-xs text-blue-400 mt-1">
                    New avatar selected: {avatarFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-6 border-b border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === "profile"
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Profile
                {activeTab === "profile" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === "security"
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Security
                {activeTab === "security" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
            </div>

            {activeTab === "profile" ? (
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-5 text-zinc-500" />
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-10 py-3 text-sm text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 size-5 text-zinc-500" />
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full bg-zinc-900/30 border border-zinc-700 rounded-xl px-10 py-3 text-sm text-zinc-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Email cannot be changed</p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin size-5" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 size-5 text-zinc-500" />
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-10 py-3 text-sm text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                      placeholder="Enter current password"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 size-5 text-zinc-500" />
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-10 py-3 text-sm text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 size-5 text-zinc-500" />
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl px-10 py-3 text-sm text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin size-5" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
