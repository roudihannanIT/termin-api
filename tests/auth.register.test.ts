import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { registerUser, EmailAlreadyExistsError } from "../src/modules/auth/auth.service";

describe("registerUser", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a user with a hashed password", async () => {
    const user = await registerUser("test@example.com", "password123");

    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("USER");
    expect(user).not.toHaveProperty("passwordHash");

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "test@example.com" } });
    expect(stored.passwordHash).not.toBe("password123");
  });

  it("rejects a duplicate email", async () => {
    await registerUser("dup@example.com", "password123");

    await expect(registerUser("dup@example.com", "password456")).rejects.toThrow(EmailAlreadyExistsError);
  });
});