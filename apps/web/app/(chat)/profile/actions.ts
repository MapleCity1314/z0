"use server";

import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateProfile(userId: string, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const avatar = formData.get("avatar") as string;

    if (!name) {
      return { success: false, message: "Name is required" };
    }

    await db
      .update(user)
      .set({
        name,
        avatar: avatar || null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    revalidatePath("/profile");
    return { success: true, message: "Profile updated successfully" };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, message: "Failed to update profile" };
  }
}

export async function updatePassword(userId: string, formData: FormData) {
  try {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, message: "All fields are required" };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: "Passwords do not match" };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "Password must be at least 6 characters" };
    }

    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!existingUser) {
      return { success: false, message: "User not found" };
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      existingUser.password
    );

    if (!isValidPassword) {
      return { success: false, message: "Current password is incorrect" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db
      .update(user)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.error("Update password error:", error);
    return { success: false, message: "Failed to update password" };
  }
}
