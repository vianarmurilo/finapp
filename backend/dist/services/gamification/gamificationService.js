"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
exports.computeDailyStreak = computeDailyStreak;
exports.computeFinancialHealthScore = computeFinancialHealthScore;
const client_1 = require("@prisma/client");
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../../config/prisma");
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function normalizeDate(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function isSameDay(left, right) {
    return normalizeDate(left).getTime() === normalizeDate(right).getTime();
}
function isYesterday(left, right) {
    const expected = new Date(normalizeDate(right).getTime() - 24 * 60 * 60 * 1000);
    return normalizeDate(left).getTime() === expected.getTime();
}
function monthRange(month, year) {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { start, end };
}
function monthKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function toDecimalNumber(value) {
    return Number(value ?? 0);
}
function computeDailyStreak(previous, todayWithinBudget, today) {
    if (!todayWithinBudget) {
        return 0;
    }
    if (previous && previous.withinBudget && isYesterday(previous.date, today)) {
        return previous.streakCount + 1;
    }
    return 1;
}
function computeFinancialHealthScore(input) {
    const streakScore = clamp((input.streakCount / 7) * 25, 0, 25);
    const savingsScore = clamp(input.savingsRate * 1.5, 0, 30);
    const goalsScore = clamp(input.goalsProgress * 20, 0, 20);
    const envelopeScore = clamp(input.envelopeRespectRate * 25, 0, 25);
    const score = Math.round(clamp(streakScore + savingsScore + goalsScore + envelopeScore, 0, 100));
    let justification = "Seu comportamento financeiro está estável.";
    if (score >= 80) {
        justification = "Você mantém bom controle, boa reserva e disciplina consistente.";
    }
    else if (score >= 60) {
        justification = "Há consistência, mas alguns ajustes em gastos e metas ainda podem melhorar o resultado.";
    }
    else if (score >= 40) {
        justification = "O orçamento mostra sinais mistos e precisa de mais controle nas saídas.";
    }
    else {
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
class GamificationService {
    async calculateDailyStreak(userId) {
        const today = normalizeDate(new Date());
        const currentMonth = today.getUTCMonth() + 1;
        const currentYear = today.getUTCFullYear();
        const { start, end } = monthRange(currentMonth, currentYear);
        const [envelopes, todayExpenses, previousRecord] = await Promise.all([
            prisma_1.prisma.envelope.findMany({ where: { userId, month: currentMonth, year: currentYear } }),
            prisma_1.prisma.transaction.aggregate({
                where: {
                    userId,
                    type: "EXPENSE",
                    occurredAt: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
                },
                _sum: { amount: true },
            }),
            prisma_1.prisma.streakRecord.findFirst({
                where: { userId, date: { lt: today } },
                orderBy: { date: "desc" },
            }),
        ]);
        const budgetSum = envelopes.reduce((total, envelope) => total + toDecimalNumber(envelope.budgetAmount), 0);
        const dailyBudget = budgetSum > 0 ? budgetSum / new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate() : 0;
        const todaySpent = toDecimalNumber(todayExpenses._sum.amount);
        const withinBudget = budgetSum === 0 ? todaySpent === 0 : todaySpent <= dailyBudget;
        const streakCount = computeDailyStreak(previousRecord ? { date: previousRecord.date, withinBudget: previousRecord.withinBudget, streakCount: previousRecord.streakCount } : null, withinBudget, today);
        await prisma_1.prisma.streakRecord.upsert({
            where: { userId_date: { userId, date: today } },
            create: { userId, date: today, withinBudget, streakCount },
            update: { withinBudget, streakCount },
        });
        return { date: today, withinBudget, streakCount };
    }
    async getCurrentStreak(userId) {
        return this.calculateDailyStreak(userId);
    }
    async checkAndAwardBadges(userId) {
        const streak = await this.calculateDailyStreak(userId);
        const now = new Date();
        const currentMonth = now.getUTCMonth() + 1;
        const currentYear = now.getUTCFullYear();
        const { start, end } = monthRange(currentMonth, currentYear);
        const [incomeAgg, expenseAgg, achievedGoal, importedTransaction, months] = await Promise.all([
            prisma_1.prisma.transaction.aggregate({
                where: { userId, type: "INCOME", occurredAt: { gte: start, lte: end } },
                _sum: { amount: true },
            }),
            prisma_1.prisma.transaction.aggregate({
                where: { userId, type: "EXPENSE", occurredAt: { gte: start, lte: end } },
                _sum: { amount: true },
            }),
            prisma_1.prisma.goal.findFirst({ where: { userId, status: client_1.GoalStatus.ACHIEVED } }),
            prisma_1.prisma.transaction.findFirst({ where: { userId, tags: { has: "imported" } } }),
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
        ];
        const earned = [];
        for (const definition of badgeDefinitions) {
            if (!definition.shouldAward) {
                continue;
            }
            const badge = await prisma_1.prisma.badge.upsert({
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
    async getBadges(userId) {
        const badges = await prisma_1.prisma.badge.findMany({ where: { userId }, orderBy: { earnedAt: "desc" } });
        return badges.map((badge) => ({
            id: badge.id,
            type: badge.type,
            earnedAt: badge.earnedAt,
            metadata: badge.metadata,
        }));
    }
    async getFinancialHealthScore(userId) {
        const today = normalizeDate(new Date());
        const currentMonth = today.getUTCMonth() + 1;
        const currentYear = today.getUTCFullYear();
        const { start, end } = monthRange(currentMonth, currentYear);
        const [latestStreak, transactions, activeGoals, envelopes] = await Promise.all([
            prisma_1.prisma.streakRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
            prisma_1.prisma.transaction.findMany({ where: { userId, occurredAt: { gte: start, lte: end } } }),
            prisma_1.prisma.goal.findMany({ where: { userId, status: { in: [client_1.GoalStatus.ACTIVE, client_1.GoalStatus.ACHIEVED, client_1.GoalStatus.PAUSED] } } }),
            prisma_1.prisma.envelope.findMany({ where: { userId, month: currentMonth, year: currentYear } }),
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
        node_cron_1.default.schedule("5 0 * * *", async () => {
            const users = await prisma_1.prisma.user.findMany({ select: { id: true } });
            for (const user of users) {
                try {
                    await this.calculateDailyStreak(user.id);
                    await this.checkAndAwardBadges(user.id);
                }
                catch (error) {
                    console.error(JSON.stringify({ event: "gamification.cron.error", userId: user.id, message: error.message }));
                }
            }
        }, { timezone: "America/Sao_Paulo" });
    }
    async getSavingsMonths(userId, monthsCount) {
        const now = new Date();
        const months = [];
        for (let offset = monthsCount - 1; offset >= 0; offset -= 1) {
            const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
            const month = date.getUTCMonth() + 1;
            const year = date.getUTCFullYear();
            const { start, end } = monthRange(month, year);
            const [incomeAgg, expenseAgg] = await Promise.all([
                prisma_1.prisma.transaction.aggregate({ where: { userId, type: "INCOME", occurredAt: { gte: start, lte: end } }, _sum: { amount: true } }),
                prisma_1.prisma.transaction.aggregate({ where: { userId, type: "EXPENSE", occurredAt: { gte: start, lte: end } }, _sum: { amount: true } }),
            ]);
            const income = toDecimalNumber(incomeAgg._sum.amount);
            const expense = toDecimalNumber(expenseAgg._sum.amount);
            const rate = income > 0 ? ((income - expense) / income) * 100 : 0;
            months.push(Number(rate.toFixed(2)));
        }
        return months;
    }
}
exports.GamificationService = GamificationService;
