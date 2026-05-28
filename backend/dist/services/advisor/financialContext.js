"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUserFinancialContext = buildUserFinancialContext;
const prisma_1 = require("../../config/prisma");
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
async function buildUserFinancialContext(userId, periodMonths = 3) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (periodMonths - 1), 1);
    const transactions = await prisma_1.prisma.transaction.findMany({
        where: {
            userId,
            occurredAt: { gte: start, lte: now },
        },
        include: { category: true },
    });
    // build totals per month
    const monthMap = new Map();
    for (let m = 0; m < periodMonths; m++) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(key, { income: 0, expense: 0 });
    }
    for (const t of transactions) {
        const d = new Date(t.occurredAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = monthMap.get(key);
        if (!bucket)
            continue;
        if (t.type === "INCOME")
            bucket.income += Number(t.amount);
        else
            bucket.expense += Number(t.amount);
    }
    const totalsByMonth = Array.from(monthMap.entries())
        .sort()
        .map(([month, v]) => ({ month, income: Number(v.income), expense: Number(v.expense) }));
    // top 5 expense categories
    const expenseByCategory = new Map();
    const categoryNames = new Map();
    for (const t of transactions) {
        if (t.type !== "EXPENSE")
            continue;
        const cid = t.categoryId;
        expenseByCategory.set(cid, (expenseByCategory.get(cid) ?? 0) + Number(t.amount));
        categoryNames.set(cid, t.category?.name ?? null);
    }
    const topExpenseCategories = Array.from(expenseByCategory.entries())
        .map(([cid, total]) => ({ categoryId: cid, categoryName: categoryNames.get(cid) ?? null, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    // goals progress
    const goals = await prisma_1.prisma.goal.findMany({ where: { userId, status: { not: "CANCELLED" } }, include: { movements: true } });
    const activeGoals = goals.map((g) => {
        const current = Number(g.currentAmount ?? 0);
        const target = Number(g.targetAmount ?? 0);
        const progressPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
        const daysRemaining = g.deadline ? Math.max(0, Math.ceil((g.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;
        return {
            id: g.id,
            title: g.title,
            targetAmount: currencyFormatter.format(target),
            currentAmount: currencyFormatter.format(current),
            progressPercent: Number(progressPercent.toFixed(2)),
            daysRemaining,
        };
    });
    // subscriptions
    const subscriptions = await prisma_1.prisma.subscription.findMany({ where: { userId, isActive: true } });
    let totalSubscriptionMonthly = 0;
    const subsFormatted = subscriptions.map((s) => {
        let monthly = Number(s.amount);
        if (s.frequency === "WEEKLY")
            monthly = monthly * (52 / 12);
        if (s.frequency === "YEARLY")
            monthly = monthly / 12;
        totalSubscriptionMonthly += monthly;
        return { name: s.name, amount: currencyFormatter.format(Number(s.amount)), frequency: s.frequency };
    });
    // largest single expense
    const expenses = transactions.filter((t) => t.type === "EXPENSE");
    let largestExpense = null;
    if (expenses.length > 0) {
        const max = expenses.reduce((prev, cur) => (Number(cur.amount) > Number(prev.amount) ? cur : prev));
        largestExpense = { amount: currencyFormatter.format(Number(max.amount)), description: max.description };
    }
    // average saving rate
    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of transactions) {
        if (t.type === "INCOME")
            totalIncome += Number(t.amount);
        else
            totalExpense += Number(t.amount);
    }
    const averageSavingRatePercent = totalIncome > 0 ? Number((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(2)) : 0;
    return {
        periodMonths,
        totalsByMonth,
        topExpenseCategories: topExpenseCategories.map((c) => ({ ...c, total: Number(c.total) })),
        activeGoals,
        subscriptions: subsFormatted,
        totalSubscriptionMonthly: currencyFormatter.format(totalSubscriptionMonthly),
        largestExpense,
        averageSavingRatePercent,
    };
}
