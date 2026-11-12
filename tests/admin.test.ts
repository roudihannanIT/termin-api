import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function loginAs(email: string, password: string) {
  const res = await request(app).post("/auth/login").send({ email, password });
  return res.body.token as string;
}

describe("admin routes", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: { email: "admin@test.com", passwordHash: await bcrypt.hash("password123", 12), role: "ADMIN" },
    });
    await request(app).post("/auth/register").send({ email: "user@test.com", password: "password123" });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/admin/users");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a USER token", async () => {
    const token = await loginAs("user@test.com", "password123");
    const res = await request(app).get("/admin/users").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("returns 200 with users for an ADMIN token", async () => {
    const token = await loginAs("admin@test.com", "password123");
    const res = await request(app).get("/admin/users").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.users[0]).not.toHaveProperty("passwordHash");
  });
});