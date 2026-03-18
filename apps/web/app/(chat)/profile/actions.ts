"use server";

import { apiFetch } from "@/lib/api";
import { getActionErrorMessage } from "@/lib/auth-errors";

export async function updateProfile(_userId: string, formData: FormData) {
  try {
    const profile = await apiFetch<{
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    }>("/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: formData.get("name"),
        avatar: formData.get("avatar") || null,
      }),
    });

    return {
      success: true,
      message: "Profile updated successfully",
      data: profile,
    };
  } catch (error) {
    return {
      success: false,
      message: getActionErrorMessage(error, "Failed to update profile"),
    };
  }
}

export async function updatePassword() {
  return {
    success: false,
    message: "Password updates are managed through GitHub with Better Auth",
  };
}
