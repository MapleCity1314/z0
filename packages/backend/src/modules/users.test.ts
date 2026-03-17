import { describe, expect, it, vi } from "vitest";
import { UsersService, type UserProfile, type UsersRepository } from "./users";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "99999999-9999-1999-8999-999999999999",
    name: "Ada",
    email: "ada@example.com",
    avatar: null,
    role: "user",
    status: "active",
    emailVerified: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeRepository(): UsersRepository {
  return {
    findProfileById: vi.fn(async () => makeProfile()),
    updateProfile: vi.fn(async (_id, updates) => makeProfile(updates)),
  };
}

describe("UsersService", () => {
  it("loads the authenticated user profile", async () => {
    const service = new UsersService(makeRepository());
    const result = await service.getProfile("99999999-9999-1999-8999-999999999999");

    expect(result.ok).toBe(true);
  });

  it("rejects invalid avatar URLs", async () => {
    const service = new UsersService(makeRepository());

    await expect(
      service.updateProfile({
        userId: "99999999-9999-1999-8999-999999999999",
        name: "Ada",
        avatar: "not-a-url",
      }),
    ).rejects.toBeDefined();
  });
});
