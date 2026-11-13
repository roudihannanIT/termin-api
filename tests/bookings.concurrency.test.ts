import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { env } from "../src/config/env";

const app = createApp();
const USER_COUNT = 50;

describe("bookings concurrency", () => {
  let slotId: string;
  let tokens: string[] = [];

  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.slot.deleteMany();
    await prisma.service.deleteMany();
    await prisma.office.deleteMany();
    await prisma.user.deleteMany();

    const office = await prisma.office.create({ data: { name: "Anmeldung", city: "Ulm" } });
    const service = await prisma.service.create({
      data: { officeId: office.id, name: "Anmeldung" },
    });
    const slot = await prisma.slot.create({
      data: {
        serviceId: service.id,
        startsAt: new Date("2026-12-01T08:00:00Z"),
        endsAt: new Date("2026-12-01T08:15:00Z"),
      },
    });
    slotId = slot.id;

    const passwordHash = await bcrypt.hash("password123", 12);

    tokens = [];
    for (let i = 0; i < USER_COUNT; i++) {
      const user = await prisma.user.create({
        data: { email: `user${i}@test.com`, passwordHash, role: "USER" },
      });
      tokens.push(jwt.sign({ sub: user.id, role: "USER" }, env.JWT_SECRET, { expiresIn: "15m" }));
    }
  }, 30_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("allows exactly one booking out of 50 concurrent requests", async () => {
    const results = await Promise.all(
      tokens.map((token) =>
        request(app).post("/bookings").set("Authorization", `Bearer ${token}`).send({ slotId })
      )
    );

    const statuses = results.map((r) => r.status);
    const created = statuses.filter((s) => s === 201).length;
    const conflicts = statuses.filter((s) => s === 409).length;
    const other = statuses.filter((s) => s !== 201 && s !== 409);

    expect(other).toEqual([]);
    expect(created).toBe(1);
    expect(conflicts).toBe(USER_COUNT - 1);

    const confirmed = await prisma.booking.count({ where: { slotId, status: "CONFIRMED" } });
    expect(confirmed).toBe(1);
  }, 30_000);
});