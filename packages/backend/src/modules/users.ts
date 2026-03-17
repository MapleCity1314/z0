import { z } from "zod";
import { type DomainResult, fail, ok } from "../common/result";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string | null;
  status: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface UsersRepository {
  findProfileById(userId: string): Promise<UserProfile | null>;
  updateProfile(
    userId: string,
    updates: { name: string; avatar: string | null },
  ): Promise<UserProfile | null>;
}

export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async getProfile(userId: string): Promise<DomainResult<UserProfile>> {
    const profile = await this.repository.findProfileById(z.string().uuid().parse(userId));
    return profile
      ? ok(profile)
      : fail({ code: "user_not_found", message: "User not found" });
  }

  async updateProfile(input: {
    userId: string;
    name: string;
    avatar?: string | null;
  }): Promise<DomainResult<UserProfile>> {
    const parsed = z
      .object({
        userId: z.string().uuid(),
        name: z.string().min(1).max(64),
        avatar: z.string().url().nullable().optional(),
      })
      .parse(input);

    const profile = await this.repository.updateProfile(parsed.userId, {
      name: parsed.name,
      avatar: parsed.avatar ?? null,
    });

    return profile
      ? ok(profile)
      : fail({ code: "user_update_failed", message: "Failed to update profile" });
  }
}
