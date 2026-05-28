import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";

const analyticsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export class AnalyticsService {
  async overview(userId: string, rawQuery: unknown) {
    const query = analyticsQuerySchema.parse(rawQuery);

    const endDate = query.endDate ?? new Date();
    const startDate = query.startDate ?? startOfMonth(endDate);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: { gte: startDate, lte: endDate },
      },
      include: {
        category: true,
      },
      orderBy: { occurredAt: "asc" },
    });

    const expenses = transactions.filter((t) => t.type === "EXPENSE");
    const incomes = transactions.filter((t) => t.type === "INCOME");

    const totalExpenses = expenses.reduce((acc, t) => acc.plus(t.amount), new Prisma.Decimal(0));
    const totalIncomes = incomes.reduce((acc, t) => acc.plus(t.amount), new Prisma.Decimal(0));
    const reservedInGoalsAgg = await prisma.goal.aggregate({
      where: {
        userId,
        status: { in: ["ACTIVE", "ACHIEVED", "PAUSED"] },
      },
      _sum: { currentAmount: true },
    });

    const reservedInGoals = reservedInGoalsAgg._sum.currentAmount ?? new Prisma.Decimal(0);
    const balance = totalIncomes.minus(totalExpenses).minus(reservedInGoals);

    const diffMs = endDate.getTime() - startDate.getTime();
    const daysInPeriod = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
    const dailyAverage = totalExpenses.div(daysInPeriod);

    const byCategoryMap = new Map<string, Prisma.Decimal>();
    for (const tx of expenses) {
      const current = byCategoryMap.get(tx.category.name) ?? new Prisma.Decimal(0);
      byCategoryMap.set(tx.category.name, current.plus(tx.amount));
    }

    const byCategory = Array.from(byCategoryMap.entries()).map(([category, amount]) => ({
      category,
      amount: Number(amount),
    }));

    const previousStart = new Date(startDate.getTime() - diffMs - 24 * 60 * 60 * 1000);
    const previousEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);

    const previousPeriod = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        occurredAt: { gte: previousStart, lte: previousEnd },
      },
      _sum: { amount: true },
    });

    const previousExpense = previousPeriod._sum.amount ?? new Prisma.Decimal(0);
    const trendPercent = previousExpense.equals(0)
      ? 100
      : Number(totalExpenses.minus(previousExpense).div(previousExpense).mul(100));

    const insights: string[] = [];
    if (trendPercent > 20) {
      insights.push("Seus gastos subiram mais de 20% no periodo atual.");
    }
    if (trendPercent < -10) {
      insights.push("Boa evolucao: seus gastos cairam mais de 10% no periodo.");
    }

    const topCategory = byCategory.sort((a, b) => b.amount - a.amount)[0];
    if (topCategory) {
      insights.push(`Maior foco de gasto: ${topCategory.category}.`);
    }

    return {
      period: { startDate, endDate, daysInPeriod },
      totals: {
        incomes: Number(totalIncomes),
        expenses: Number(totalExpenses),
        balance: Number(balance),
        reservedInGoals: Number(reservedInGoals),
      },
      dailyAverageExpense: Number(dailyAverage),
      trend: {
        currentExpense: Number(totalExpenses),
        previousExpense: Number(previousExpense),
        percent: Number(trendPercent.toFixed(2)),
      },
      byCategory,
      insights,
    };
  }
}
