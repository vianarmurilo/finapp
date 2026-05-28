import { GoalStatus, Prisma } from "@prisma/client";
import cron from "node-cron";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";

export type StreakSummary = {
  date: Date;
  withinBudget: boolean;
  streakCount: number;
};

export type BadgeSummary = {
  id: string;
  type: string;
  earnedAt: Date;
  metadata: Prisma.JsonValue;
};

export type FinancialHealthScore = {
  score: number;
  streakScore: number;
  savingsScore: number;
  goalsScore: number;
  envelopeScore: number;
  streakCount: number;
  savingsRate: number;
  goalsProgress: number;
  envelopeRespectRate: number;
  justification: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isSameDay(left: Date, right: Date) {
  return normalizeDate(left).getTime() === normalizeDate(right).getTime();
}

function isYesterday(left: Date, right: Date) {
  const expected = new Date(normalizeDate(right).getTime() - 24 * 60 * 60 * 1000);
  return normalizeDate(left).getTime() === expected.getTime();
}

function monthRange(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toDecimalNumber(value: Prisma.Decimal | null | undefined) {
  return Number(value ?? 0);
}

export function computeDailyStreak(previous: { date: Date; withinBudget: boolean; streakCount: number } | null, todayWithinBudget: boolean, today: Date) {
  if (!todayWithinBudget) {
    return 0;
  }

  if (previous && previous.withinBudget && isYesterday(previous.date, today)) {
    return previous.streakCount + 1;
  }

  return 1;
}

export function computeFinancialHealthScore(input: {
  streakCount: number;
  savingsRate: number;
  goalsProgress: number;
  envelopeRespectRate: number;
}) {
  const streakScore = clamp((input.streakCount / 7) * 25, 0, 25);
  const savingsScore = clamp(input.savingsRate * 1.5, 0, 30);
  const goalsScore = clamp(input.goalsProgress * 20, 0, 20);
  const envelopeScore = clamp(input.envelopeRespectRate * 25, 0, 25);
  const score = Math.round(clamp(streakScore + savingsScore + goalsScore + envelopeScore, 0, 100));

  let justification = "Seu comportamento financeiro está estável.";
  if (score >= 80) {
    justification = "Você mantém bom controle, boa reserva e disciplina consistente.";
  } else if (score >= 60) {
    justification = "Há consistência, mas alguns ajustes em gastos e metas ainda podem melhorar o resultado.";
  } else if (score >= 40) {
    justification = "O orçamento mostra sinais mistos e precisa de mais controle nas saídas.";
  } else {
    justification = "O padrão atual indica risco elevado e exige revisão imediata do orçamento.";
  }

  return {
    score,
    streakScore: Math.round(streakScore),
    savingsScore: Math.round(savingsScore),
    goalsScore: Math.round(goalsScore),
    envelopeScore: Math.round(envelopeScore),
    justification,
  };
}

export class GamificationService {
  async calculateDailyStreak(userId: string): Promise<StreakSummary> {
    const today = normalizeDate(new Date());
    const currentMonth = today.getUTCMonth() + 1;
    const currentYear = today.getUTCFullYear();
    const { start, end } = monthRange(currentMonth, currentYear);

    const [envelopes, todayExpenses, previousRecord] = await Promise.all([
      prisma.envelope.findMany({ where: { userId, month: currentMonth, year: currentYear } }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          occurredAt: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        },
        _sum: { amount: true },
      }),
      prisma.streakRecord.findFirst({
        where: { userId, date: { lt: today } },
        orderBy: { date: "desc" },
      }),
    ]);

    const budgetSum = envelopes.reduce((total, envelope) => total + toDecimalNumber(envelope.budgetAmount), 0);
    const dailyBudget = budgetSum > 0 ? budgetSum / new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate() : 0;
    const todaySpent = toDecimalNumber(todayExpenses._sum.amount);
    const withinBudget = budgetSum === 0 ? todaySpent === 0 : todaySpent <= dailyBudget;
    const streakCount = computeDailyStreak(
      previousRecord ? { date: previousRecord.date, withinBudget: previousRecord.withinBudget, streakCount: previousRecord.streakCount } : null,
      withinBudget,
      today,
    );

    await prisma.streakRecord.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, withinBudget, streakCount },
      update: { withinBudget, streakCount },
    });

    return { date: today, withinBudget, streakCount };
  }

  async getCurrentStreak(userId: string): Promise<StreakSummary> {
    return this.calculateDailyStreak(userId);
  }

  async checkAndAwardBadges(userId: string): Promise<BadgeSummary[]> {
    const streak = await this.calculateDailyStreak(userId);
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();
    const { start, end } = monthRange(currentMonth, currentYear);

    const [incomeAgg, expenseAgg, achievedGoal, importedTransaction, months] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "INCOME", occurredAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.goal.findFirst({ where: { userId, status: GoalStatus.ACHIEVED } }),
      prisma.transaction.findFirst({ where: { userId, tags: { has: "imported" } } }),
      this.getSavingsMonths(userId, 2),
    ]);

    const monthBalance = toDecimalNumber(incomeAgg._sum.amount) - toDecimalNumber(expenseAgg._sum.amount);

    const badgeDefinitions = [
      {
        type: "primeira-semana-controlada",
        shouldAward: streak.streakCount >= 7,
        metadata: { label: "Primeira semana controlada", streakCount: streak.streakCount },
      },
      {
        type: "mes-no-azul",
        shouldAward: monthBalance > 0,
        metadata: { label: "Mês no azul", balance: monthBalance },
      },
      {
        type: "meta-atingida",
        shouldAward: achievedGoal !== null,
        metadata: { label: "Meta atingida", goalId: achievedGoal?.id ?? null },
      },
      {
        type: "importador",
        shouldAward: importedTransaction !== null,
        metadata: { label: "Importador", firstImport: importedTransaction?.createdAt ?? null },
      },
      {
        type: "poupador",
        shouldAward: months.every((rate) => rate > 20),
        metadata: { label: "Poupador", rates: months },
      },
    ] as const;

    const earned: BadgeSummary[] = [];

    for (const definition of badgeDefinitions) {
      if (!definition.shouldAward) {
        continue;
      }

      const badge = await prisma.badge.upsert({
        where: { userId_type: { userId, type: definition.type } },
        create: {
          userId,
          type: definition.type,
          metadata: definition.metadata,
        },
        update: {},
      });

      earned.push({
        id: badge.id,
        type: badge.type,
        earnedAt: badge.earnedAt,
        metadata: badge.metadata,
      });
    }

    return earned;
  }

  async getBadges(userId: string): Promise<BadgeSummary[]> {
    const badges = await prisma.badge.findMany({ where: { userId }, orderBy: { earnedAt: "desc" } });
    return badges.map((badge) => ({
      id: badge.id,
      type: badge.type,
      earnedAt: badge.earnedAt,
      metadata: badge.metadata,
    }));
  }

  async getFinancialHealthScore(userId: string): Promise<FinancialHealthScore> {
    const today = normalizeDate(new Date());
    const currentMonth = today.getUTCMonth() + 1;
    const currentYear = today.getUTCFullYear();
    const { start, end } = monthRange(currentMonth, currentYear);

    const [latestStreak, transactions, activeGoals, envelopes] = await Promise.all([
      prisma.streakRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
      prisma.transaction.findMany({ where: { userId, occurredAt: { gte: start, lte: end } } }),
      prisma.goal.findMany({ where: { userId, status: { in: [GoalStatus.ACTIVE, GoalStatus.ACHIEVED, GoalStatus.PAUSED] } } }),
      prisma.envelope.findMany({ where: { userId, month: currentMonth, year: currentYear } }),
    ]);

    const income = transactions.filter((transaction) => transaction.type === "INCOME").reduce((total, transaction) => total + toDecimalNumber(transaction.amount), 0);
    const expense = transactions.filter((transaction) => transaction.type === "EXPENSE").reduce((total, transaction) => total + toDecimalNumber(transaction.amount), 0);
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const goalsProgress = activeGoals.length > 0
      ? activeGoals.reduce((total, goal) => total + (toDecimalNumber(goal.currentAmount) / Math.max(1, toDecimalNumber(goal.targetAmount))), 0) / activeGoals.length
      : 0;
    const envelopeRespectRate = envelopes.length > 0
      ? envelopes.filter((envelope) => toDecimalNumber(envelope.currentSpent) <= toDecimalNumber(envelope.budgetAmount)).length / envelopes.length
      : 1;

    const computed = computeFinancialHealthScore({
      streakCount: latestStreak?.streakCount ?? 0,
      savingsRate,
      goalsProgress,
      envelopeRespectRate,
    });

    return {
      score: computed.score,
      streakScore: computed.streakScore,
      savingsScore: computed.savingsScore,
      goalsScore: computed.goalsScore,
      envelopeScore: computed.envelopeScore,
      streakCount: latestStreak?.streakCount ?? 0,
      savingsRate: Number(savingsRate.toFixed(2)),
      goalsProgress: Number(goalsProgress.toFixed(2)),
      envelopeRespectRate: Number(envelopeRespectRate.toFixed(2)),
      justification: computed.justification,
    };
  }

  scheduleDailyJobs() {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    cron.schedule("5 0 * * *", async () => {
      const users = await prisma.user.findMany({ select: { id: true } });
      for (const user of users) {
        try {
          await this.calculateDailyStreak(user.id);
          await this.checkAndAwardBadges(user.id);
        } catch (error) {
          console.error(JSON.stringify({ event: "gamification.cron.error", userId: user.id, message: (error as Error).message }));
        }
      }
    }, { timezone: "America/Sao_Paulo" });
  }

  private async getSavingsMonths(userId: string, monthsCount: number) {
    const now = new Date();
    const months: number[] = [];

    for (let offset = monthsCount - 1; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const month = date.getUTCMonth() + 1;
      const year = date.getUTCFullYear();
      const { start, end } = monthRange(month, year);

      const [incomeAgg, expenseAgg] = await Promise.all([
        prisma.transaction.aggregate({ where: { userId, type: "INCOME", occurredAt: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.transaction.aggregate({ where: { userId, type: "EXPENSE", occurredAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      ]);

      const income = toDecimalNumber(incomeAgg._sum.amount);
      const expense = toDecimalNumber(expenseAgg._sum.amount);
      const rate = income > 0 ? ((income - expense) / income) * 100 : 0;
      months.push(Number(rate.toFixed(2)));
    }

    return months;
  }
}
