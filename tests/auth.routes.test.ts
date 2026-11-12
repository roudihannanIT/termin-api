import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

describe("auth routes", () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /auth/register", () => {
    it("returns 201 without passwordHash", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ email: "new@example.com", password: "password123" });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe("new@example.com");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("returns 400 for an invalid email", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ email: "not-an-email", password: "password123" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for a short password", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ email: "short@example.com", password: "123" });

      expect(res.status).toBe(400);
    });

    it("returns 409 for a duplicate email", async () => {
      await request(app).post("/auth/register").send({ email: "dup@example.com", password: "password123" });

      const res = await request(app)
        .post("/auth/register")
        .send({ email: "dup@example.com", password: "password456" });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EMAIL_EXISTS");
    });
  });

  describe("POST /auth/login", () => {
    beforeEach(async () => {
      await request(app)
        .post("/auth/register")
        .send({ email: "login@example.com", password: "password123" });
    });

    it("returns 200 with a token for valid credentials", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "login@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
    });

    it("returns 401 for a wrong password", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "login@example.com", password: "wrong-password" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });
});