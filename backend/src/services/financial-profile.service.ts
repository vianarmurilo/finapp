import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

function classifyProfile(savingsRate: number, impulseRate: number, variability: number): "Conservador" | "Equilibrado" | "Impulsivo" {
  if (savingsRate >= 0.2 && impulseRate < 0.25 && variability < 0.35) {
    return "Conservador";
  }

  if (savingsRate < 0.05 || impulseRate > 0.45 || variability > 0.55) {
    return "Impulsivo";
  }

  return "Equilibrado";
}

export class FinancialProfileService {
  async analyze(userId: string) {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
    });

    const incomes = transactions.filter((tx) => tx.type === "INCOME");
    const expenses = transactions.filter((tx) => tx.type === "EXPENSE");

    const totalIncome = incomes.reduce((acc, tx) => acc.plus(tx.amount), new Prisma.Decimal(0));
    const totalExpense = expenses.reduce((acc, tx) => acc.plus(tx.amount), new Prisma.Decimal(0));

    const savingsRate = totalIncome.equals(0) ? 0 : Number(totalIncome.minus(totalExpense).div(totalIncome));

    const impulseKeywords = ["lazer", "entretenimento", "delivery", "streaming", "games", "restaurante"];
    const impulseExpenses = expenses
      .filter((tx) => {
        const bucket = `${tx.category.name} ${tx.description}`.toLowerCase();
        return impulseKeywords.some((keyword) => bucket.includes(keyword));
      })
      .reduce((acc, tx) => acc.plus(tx.amount), new Prisma.Decimal(0));

    const impulseRate = totalExpense.equals(0) ? 0 : Number(impulseExpenses.div(totalExpense));

    const monthlyMap = new Map<string, number>();
    for (const tx of expenses) {
      const key = `${tx.occurredAt.getFullYear()}-${String(tx.occurredAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(tx.amount));
    }

    const monthlyValues = Array.from(monthlyMap.values());
    const avg = monthlyValues.length ? monthlyValues.reduce((acc, value) => acc + value, 0) / monthlyValues.length : 0;
    const variance =
      monthlyValues.length > 1
        ? monthlyValues.reduce((acc, value) => acc + (value - avg) ** 2, 0) / monthlyValues.length
        : 0;
    const stdDev = Math.sqrt(variance);
    const variability = avg === 0 ? 0 : stdDev / avg;

    const profile = classifyProfile(savingsRate, impulseRate, variability);

    return {
      profile,
      metrics: {
        savingsRate: Number(savingsRate.toFixed(4)),
        impulseRate: Number(impulseRate.toFixed(4)),
        variability: Number(variability.toFixed(4)),
      },
    };
  }
}
