import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { PredictionService } from "./prediction.service";

const alertQuerySchema = z.object({
  budgetLimit: z.coerce.number().positive().optional(),
  daysAhead: z.coerce.number().int().min(1).max(365).default(30),
});

export class AlertService {
  constructor(private readonly predictionService: PredictionService) {}

  async generate(userId: string, rawQuery: unknown) {
    const query = alertQuerySchema.parse(rawQuery);
    const alerts: Array<{ type: string; severity: "info" | "warning" | "critical"; message: string }> = [];

    const now = new Date();
    const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const prediction = await this.predictionService.predict(userId, { daysAhead: query.daysAhead });

    const [currentExpenseAgg, previousExpenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          occurredAt: { gte: startCurrentMonth, lte: now },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          occurredAt: { gte: startPreviousMonth, lte: endPreviousMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentExpense = Number(currentExpenseAgg._sum.amount ?? 0);
    const previousExpense = Number(previousExpenseAgg._sum.amount ?? 0);

    if (query.budgetLimit && currentExpense >= query.budgetLimit * 0.8) {
      alerts.push({
        type: "BUDGET_80",
        severity: "warning",
        message: "Voce atingiu 80% ou mais do orçamento mensal informado.",
      });
    }

    if (previousExpense > 0 && currentExpense > previousExpense * 1.3) {
      alerts.push({
        type: "OUTLIER_SPENDING",
        severity: "warning",
        message: "Seus gastos atuais estao acima do padrao historico recente.",
      });
    }

    if (prediction.futureBalance < 0) {
      alerts.push({
        type: "NEGATIVE_FUTURE_BALANCE",
        severity: "critical",
        message: "Sua previsao indica saldo futuro negativo.",
      });
    }

    if (!alerts.length) {
      alerts.push({
        type: "HEALTHY",
        severity: "info",
        message: "Sem alertas criticos no momento.",
      });
    }

    return {
      reference: {
        currentExpense,
        previousExpense,
      },
      alerts,
    };
  }
}
