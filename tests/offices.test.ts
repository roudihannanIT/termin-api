import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function tokenFor(email: string, password: string) {
  const res = await request(app).post("/auth/login").send({ email, password });
  return res.body.token as string;
}

describe("offices", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.office.deleteMany();
    await prisma.user.create({
      data: { email: "admin@test.com", passwordHash: await bcrypt.hash("password123", 12), role: "ADMIN" },
    });
    await request(app).post("/auth/register").send({ email: "user@test.com", password: "password123" });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists offices publicly", async () => {
    await prisma.office.create({ data: { name: "Anmeldung Berlin", city: "Berlin" } });
    const res = await request(app).get("/offices");
    expect(res.status).toBe(200);
    expect(res.body.offices).toHaveLength(1);
  });

  it("returns 401 when creating an office without a token", async () => {
    const res = await request(app).post("/offices").send({ name: "X", city: "Y" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when a USER creates an office", async () => {
    const token = await tokenFor("user@test.com", "password123");
    const res = await request(app).post("/offices").set("Authorization", `Bearer ${token}`).send({ name: "X", city: "Y" });
    expect(res.status).toBe(403);
  });

  it("creates an office as ADMIN", async () => {
    const token = await tokenFor("admin@test.com", "password123");
    const res = await request(app).post("/offices").set("Authorization", `Bearer ${token}`).send({ name: "Anmeldung Hamburg", city: "Hamburg" });
    expect(res.status).toBe(201);
    expect(res.body.city).toBe("Hamburg");
  });

  it("returns 404 when adding a service to an unknown office", async () => {
    const token = await tokenFor("admin@test.com", "password123");
    const res = await request(app)
      .post("/offices/00000000-0000-0000-0000-000000000000/services")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Anmeldung" });
    expect(res.status).toBe(404);
  });
});