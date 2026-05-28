"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvelopeService = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../../utils/app-error");
const envelopeSchema = zod_1.z.object({
    categoryId: zod_1.z.uuid().nullable().optional(),
    name: zod_1.z.string().min(2).max(140),
    budgetAmount: zod_1.z.number().positive(),
    month: zod_1.z.number().int().min(1).max(12),
    year: zod_1.z.number().int().min(2020).max(2100),
    color: zod_1.z.string().min(4).max(20),
    icon: zod_1.z.string().min(1).max(80),
});
const updateEnvelopeSchema = envelopeSchema.partial().refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo");
function normalizeText(value) {
    return value
        .normalize("NFD")
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}
function toNumber(value) {
    return Number(value ?? 0);
}
function toMonthRange(month, year) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
}
function toDto(envelope) {
    const budgetAmount = toNumber(envelope.budgetAmount);
    const currentSpent = toNumber(envelope.currentSpent);
    return {
        id: envelope.id,
        categoryId: envelope.categoryId,
        categoryName: envelope.category?.name ?? null,
        name: envelope.name,
        budgetAmount,
        currentSpent,
        month: envelope.month,
        year: envelope.year,
        color: envelope.color,
        icon: envelope.icon,
        createdAt: envelope.createdAt,
        progressPercent: budgetAmount > 0 ? Math.min(100, (currentSpent / budgetAmount) * 100) : 0,
        remainingAmount: Math.max(0, budgetAmount - currentSpent),
        isOverBudget: currentSpent > budgetAmount,
    };
}
class EnvelopeService {
    async createEnvelope(userId, rawInput) {
        const input = envelopeSchema.parse(rawInput);
        const created = await prisma_1.prisma.envelope.create({
            data: {
                userId,
                categoryId: input.categoryId ?? null,
                name: input.name,
                budgetAmount: new client_1.Prisma.Decimal(input.budgetAmount),
                currentSpent: new client_1.Prisma.Decimal(0),
                month: input.month,
                year: input.year,
                color: input.color,
                icon: input.icon,
            },
            include: { category: true },
        });
        await this.syncMonth(userId, input.month, input.year);
        return this.getByIdOrThrow(userId, created.id);
    }
    async updateEnvelope(userId, envelopeId, rawInput) {
        const existing = await this.getById(userId, envelopeId);
        if (!existing) {
            throw new app_error_1.AppError("Envelope nao encontrado", 404);
        }
        const input = updateEnvelopeSchema.parse(rawInput);
        const updated = await prisma_1.prisma.envelope.update({
            where: { id: envelopeId },
            data: {
                categoryId: input.categoryId === undefined ? undefined : input.categoryId,
                name: input.name,
                budgetAmount: input.budgetAmount !== undefined ? new client_1.Prisma.Decimal(input.budgetAmount) : undefined,
                month: input.month,
                year: input.year,
                color: input.color,
                icon: input.icon,
            },
            include: { category: true },
        });
        await this.syncMonth(userId, existing.month, existing.year);
        if (updated.month !== existing.month || updated.year !== existing.year) {
            await this.syncMonth(userId, updated.month, updated.year);
        }
        return this.getByIdOrThrow(userId, envelopeId);
    }
    async deleteEnvelope(userId, envelopeId) {
        const existing = await this.getById(userId, envelopeId);
        if (!existing) {
            throw new app_error_1.AppError("Envelope nao encontrado", 404);
        }
        await prisma_1.prisma.envelope.delete({ where: { id: envelopeId } });
        await this.syncMonth(userId, existing.month, existing.year);
    }
    async getEnvelopesForMonth(userId, month, year) {
        await this.syncMonth(userId, month, year);
        const envelopes = await prisma_1.prisma.envelope.findMany({
            where: { userId, month, year },
            include: { category: true },
            orderBy: [{ createdAt: "desc" }, { name: "asc" }],
        });
        return envelopes.map((envelope) => toDto(envelope));
    }
    async syncMonth(userId, month, year) {
        const { start, end } = toMonthRange(month, year);
        const [envelopes, transactions] = await Promise.all([
            prisma_1.prisma.envelope.findMany({
                where: { userId, month, year },
                include: { category: true },
            }),
            prisma_1.prisma.transaction.findMany({
                where: {
                    userId,
                    type: "EXPENSE",
                    occurredAt: { gte: start, lte: end },
                },
                include: { category: true },
            }),
        ]);
        const alerts = [];
        for (const envelope of envelopes) {
            const previousSpent = toNumber(envelope.currentSpent);
            const budgetAmount = toNumber(envelope.budgetAmount);
            const spent = transactions.reduce((total, transaction) => {
                if (this.matchesEnvelope(envelope, transaction.categoryId, transaction.category?.name ?? null)) {
                    return total + toNumber(transaction.amount);
                }
                return total;
            }, 0);
            await prisma_1.prisma.envelope.update({
                where: { id: envelope.id },
                data: { currentSpent: new client_1.Prisma.Decimal(spent) },
            });
            const previousPercent = budgetAmount > 0 ? (previousSpent / budgetAmount) * 100 : 0;
            const currentPercent = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
            if (previousPercent < 80 && currentPercent >= 80) {
                alerts.push({ envelopeId: envelope.id, name: envelope.name, threshold: 80, spent, budget: budgetAmount });
            }
            if (previousPercent < 100 && currentPercent >= 100) {
                alerts.push({ envelopeId: envelope.id, name: envelope.name, threshold: 100, spent, budget: budgetAmount });
            }
        }
        if (alerts.length > 0) {
            console.warn(JSON.stringify({ event: "envelope.alert", userId, month, year, alerts }));
        }
        return alerts;
    }
    async getById(userId, envelopeId) {
        return prisma_1.prisma.envelope.findFirst({
            where: { id: envelopeId, userId },
            include: { category: true },
        });
    }
    async getByIdOrThrow(userId, envelopeId) {
        const envelope = await this.getById(userId, envelopeId);
        if (!envelope) {
            throw new app_error_1.AppError("Envelope nao encontrado", 404);
        }
        return toDto(envelope);
    }
    matchesEnvelope(envelope, transactionCategoryId, transactionCategoryName) {
        if (envelope.categoryId && envelope.categoryId === transactionCategoryId) {
            return true;
        }
        if (!envelope.categoryId && transactionCategoryName) {
            return normalizeText(envelope.name) === normalizeText(transactionCategoryName);
        }
        return transactionCategoryName ? normalizeText(envelope.name) === normalizeText(transactionCategoryName) : false;
    }
}
exports.EnvelopeService = EnvelopeService;
