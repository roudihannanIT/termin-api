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

describe("slots", () => {
  let serviceId: string;
  let adminToken: string;

  beforeEach(async () => {
    await prisma.slot.deleteMany();
    await prisma.service.deleteMany();
    await prisma.office.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: { email: "admin@test.com", passwordHash: await bcrypt.hash("password123", 12), role: "ADMIN" },
    });
    await request(app).post("/auth/register").send({ email: "user@test.com", password: "password123" });

    const office = await prisma.office.create({ data: { name: "Anmeldung", city: "Berlin" } });
    const service = await prisma.service.create({
      data: { officeId: office.id, name: "Anmeldung", durationMinutes: 15 },
    });
    serviceId = service.id;
    adminToken = await tokenFor("admin@test.com", "password123");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("generates slots as ADMIN and returns the created count", async () => {
    const res = await request(app)
      .post(`/services/${serviceId}/slots/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ startsAt: "2026-12-01T08:00:00Z", count: 5, stepMinutes: 30 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ requested: 5, created: 5 });
  });

  it("does not create duplicates when generating the same range again", async () => {
    const body = { startsAt: "2026-12-01T08:00:00Z", count: 5, stepMinutes: 30 };
    await request(app).post(`/services/${serviceId}/slots/generate`).set("Authorization", `Bearer ${adminToken}`).send(body);

    const res = await request(app)
      .post(`/services/${serviceId}/slots/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.created).toBe(0);
  });

  it("returns 403 when a USER tries to generate slots", async () => {
    const userToken = await tokenFor("user@test.com", "password123");
    const res = await request(app)
      .post(`/services/${serviceId}/slots/generate`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ startsAt: "2026-12-01T08:00:00Z", count: 5, stepMinutes: 30 });

    expect(res.status).toBe(403);
  });

  it("lists only slots inside the requested time range", async () => {
    await request(app)
      .post(`/services/${serviceId}/slots/generate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ startsAt: "2026-12-01T08:00:00Z", count: 6, stepMinutes: 60 });

    const res = await request(app).get(
      `/services/${serviceId}/slots?from=2026-12-01T09:00:00Z&to=2026-12-01T11:00:00Z`
    );

    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(2);
  });
});