"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
class SubscriptionRepository {
    async create(data) {
        return prisma_1.prisma.subscription.create({
            data: {
                userId: data.userId,
                categoryId: data.categoryId,
                name: data.name,
                amount: new client_1.Prisma.Decimal(data.amount),
                frequency: data.frequency,
                nextChargeDate: data.nextChargeDate,
                isActive: data.isActive ?? true,
            },
            include: { category: true },
        });
    }
    async listByUser(userId) {
        return prisma_1.prisma.subscription.findMany({
            where: { userId },
            include: { category: true },
            orderBy: { nextChargeDate: "asc" },
        });
    }
    async findById(userId, subscriptionId) {
        return prisma_1.prisma.subscription.findFirst({ where: { id: subscriptionId, userId } });
    }
    async update(userId, subscriptionId, data) {
        const exists = await this.findById(userId, subscriptionId);
        if (!exists) {
            return null;
        }
        return prisma_1.prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                categoryId: data.categoryId,
                name: data.name,
                amount: data.amount !== undefined ? new client_1.Prisma.Decimal(data.amount) : undefined,
                frequency: data.frequency,
                nextChargeDate: data.nextChargeDate,
                isActive: data.isActive,
            },
            include: { category: true },
        });
    }
    async delete(userId, subscriptionId) {
        const exists = await this.findById(userId, subscriptionId);
        if (!exists) {
            return false;
        }
        await prisma_1.prisma.subscription.delete({ where: { id: subscriptionId } });
        return true;
    }
}
exports.SubscriptionRepository = SubscriptionRepository;
