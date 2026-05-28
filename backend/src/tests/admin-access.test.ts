import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

let authMiddleware: any;
let requireAdminRole: any;

const testSecret = "test-secret-123456789012345678901234567890";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.PORT = "3333";
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/finmind_ai";
  process.env.JWT_SECRET = testSecret;
  process.env.JWT_EXPIRES_IN = "1d";

  const middlewares = await import("../middlewares/auth.middleware");
  authMiddleware = middlewares.authMiddleware;
  requireAdminRole = middlewares.requireAdminRole;
});

function createTestApp() {
  const app = express();
  app.get("/api/admin/users", authMiddleware, requireAdminRole, (_req, res) => {
    res.status(200).json({ items: [] });
  });
  return app;
}

describe("Admin route RBAC", () => {
  it("returns 401 without token", async () => {
    const app = createTestApp();
    const response = await request(app).get("/api/admin/users");
    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin user", async () => {
    const app = createTestApp();
    const token = jwt.sign(
      { email: "user@finmind.ai", role: "USER" },
      testSecret,
      { subject: "user-id", expiresIn: "1d" },
    );
    const response = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it("returns 403 for admin role with non-exclusive email", async () => {
    const app = createTestApp();
    const token = jwt.sign(
      { email: "other-admin@finmind.ai", role: "ADMIN" },
      testSecret,
      { subject: "admin-id-2", expiresIn: "1d" },
    );
    const response = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it("returns 200 for authenticated admin user", async () => {
    const app = createTestApp();
    const token = jwt.sign(
      { email: "murilo@gmail.com", role: "ADMIN" },
      testSecret,
      { subject: "admin-id", expiresIn: "1d" },
    );
    const response = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
  });
});
