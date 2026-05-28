"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionService = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma_1 = require("../config/prisma");
const predictionQuerySchema = zod_1.z.object({
    daysAhead: zod_1.z.coerce.number().int().min(1).max(365).default(30),
});
function estimateRecurringCost(amount, frequency, daysAhead) {
    const cycles = frequency === "WEEKLY"
        ? Math.ceil(daysAhead / 7)
        : frequency === "MONTHLY"
            ? Math.ceil(daysAhead / 30)
            : Math.ceil(daysAhead / 365);
    return amount.mul(cycles);
}
class PredictionService {
    async predict(userId, rawQuery) {
        const query = predictionQuerySchema.parse(rawQuery);
        const [allTime, last30Days, subscriptions, reservedInGoalsAgg] = await Promise.all([
            prisma_1.prisma.transaction.findMany({ where: { userId } }),
            prisma_1.prisma.transaction.findMany({
                where: {
                    userId,
                    occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            }),
            prisma_1.prisma.subscription.findMany({ where: { userId, isActive: true } }),
            prisma_1.prisma.goal.aggregate({
                where: {
                    userId,
                    status: { in: ["ACTIVE", "ACHIEVED", "PAUSED"] },
                },
                _sum: { currentAmount: true },
            }),
        ]);
        const totalIncomes = allTime
            .filter((tx) => tx.type === "INCOME")
            .reduce((acc, tx) => acc.plus(tx.amount), new client_1.Prisma.Decimal(0));
        const totalExpenses = allTime
            .filter((tx) => tx.type === "EXPENSE")
            .reduce((acc, tx) => acc.plus(tx.amount), new client_1.Prisma.Decimal(0));
        const reservedInGoals = reservedInGoalsAgg._sum.currentAmount ?? new client_1.Prisma.Decimal(0);
        const currentBalance = totalIncomes.minus(totalExpenses).minus(reservedInGoals);
        const expenses30 = last30Days
            .filter((tx) => tx.type === "EXPENSE")
            .reduce((acc, tx) => acc.plus(tx.amount), new client_1.Prisma.Decimal(0));
        const incomes30 = last30Days
            .filter((tx) => tx.type === "INCOME")
            .reduce((acc, tx) => acc.plus(tx.amount), new client_1.Prisma.Decimal(0));
        const averageDailyExpense = expenses30.div(30);
        const averageDailyIncome = incomes30.div(30);
        const estimatedRecurring = subscriptions.reduce((acc, sub) => acc.plus(estimateRecurringCost(sub.amount, sub.frequency, query.daysAhead)), new client_1.Prisma.Decimal(0));
        const projectedIncomes = averageDailyIncome.mul(query.daysAhead);
        const projectedExpenses = averageDailyExpense.mul(query.daysAhead).plus(estimatedRecurring);
        const futureBalance = currentBalance.plus(projectedIncomes).minus(projectedExpenses);
        return {
            daysAhead: query.daysAhead,
            currentBalance: Number(currentBalance),
            reservedInGoals: Number(reservedInGoals),
            averageDailyExpense: Number(averageDailyExpense),
            averageDailyIncome: Number(averageDailyIncome),
            estimatedRecurring: Number(estimatedRecurring),
            projectedIncomes: Number(projectedIncomes),
            projectedExpenses: Number(projectedExpenses),
            futureBalance: Number(futureBalance),
        };
    }
}
exports.PredictionService = PredictionService;
