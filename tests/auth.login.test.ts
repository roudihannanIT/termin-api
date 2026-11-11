import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { registerUser, loginUser, InvalidCredentialsError } from "../src/modules/auth/auth.service";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env";

describe("loginUser", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    await registerUser("login@example.com", "password123");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns a token for valid credentials", async () => {
    const result = await loginUser("login@example.com", "password123");

    expect(result.token).toEqual(expect.any(String));
    const payload = jwt.verify(result.token, env.JWT_SECRET) as { sub: string; role: string };
    expect(payload.sub).toBe(result.user.id);
    expect(payload.role).toBe("USER");
  });

  it("rejects a wrong password", async () => {
    await expect(loginUser("login@example.com", "wrong-password")).rejects.toThrow(InvalidCredentialsError);
  });

  it("rejects an unknown email with the same error", async () => {
    await expect(loginUser("nobody@example.com", "password123")).rejects.toThrow(InvalidCredentialsError);
  });
});