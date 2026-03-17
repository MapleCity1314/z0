import { eq } from "drizzle-orm";
import { type UserProfile, type UsersRepository, user } from "@z0/backend";
import { db } from "./shared";

export class DrizzleUsersRepository implements UsersRepository {
  findProfileById(userId: string) {
    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then((rows: UserProfile[]) => rows[0] ?? null);
  }

  updateProfile(
    userId: string,
    updates: { name: string; avatar: string | null },
  ) {
    return db
      .update(user)
      .set({
        name: updates.name,
        avatar: updates.avatar,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .then((rows: UserProfile[]) => rows[0] ?? null);
  }
}
