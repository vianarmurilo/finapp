import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildUserFinancialContext } from "../services/advisor/financialContext";

vi.mock("../config/prisma", async () => {
  const actual = await vi.importActual<typeof import("../config/prisma")>("../config/prisma");
  return {
    prisma: {
      transaction: { findMany: vi.fn().mockResolvedValue([]) },
      goal: { findMany: vi.fn().mockResolvedValue([]) },
      subscription: { findMany: vi.fn().mockResolvedValue([]) },
      advisorCache: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    },
  };
});

describe("Advisor financial context", () => {
  it("returns a valid FinancialContext empty when no data", async () => {
    const ctx = await buildUserFinancialContext("user-1", 3);
    expect(ctx.periodMonths).toBe(3);
    expect(Array.isArray(ctx.totalsByMonth)).toBe(true);
    expect(ctx.topExpenseCategories.length).toBe(0);
  });
});
