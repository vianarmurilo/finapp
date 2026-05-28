import { describe, expect, it } from "vitest";
import { computeDailyStreak, computeFinancialHealthScore } from "../services/gamification/gamificationService";

describe("Gamification helpers", () => {
  it("continues streak when previous day was within budget", () => {
    const today = new Date("2026-05-27T00:00:00.000Z");
    const previous = {
      date: new Date("2026-05-26T00:00:00.000Z"),
      withinBudget: true,
      streakCount: 6,
    };

    expect(computeDailyStreak(previous, true, today)).toBe(7);
  });

  it("resets streak when budget is broken", () => {
    const today = new Date("2026-05-27T00:00:00.000Z");
    const previous = {
      date: new Date("2026-05-26T00:00:00.000Z"),
      withinBudget: true,
      streakCount: 6,
    };

    expect(computeDailyStreak(previous, false, today)).toBe(0);
  });

  it("returns a bounded health score", () => {
    const highScore = computeFinancialHealthScore({
      streakCount: 14,
      savingsRate: 28,
      goalsProgress: 0.9,
      envelopeRespectRate: 1,
    });

    const lowScore = computeFinancialHealthScore({
      streakCount: 0,
      savingsRate: -10,
      goalsProgress: 0,
      envelopeRespectRate: 0.2,
    });

    expect(highScore.score).toBeGreaterThan(lowScore.score);
    expect(highScore.score).toBeLessThanOrEqual(100);
    expect(lowScore.score).toBeGreaterThanOrEqual(0);
  });
});
