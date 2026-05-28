"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
class GoalRepository {
    async create(data) {
        return prisma_1.prisma.goal.create({
            data: {
                userId: data.userId,
                title: data.title,
                description: data.description,
                targetAmount: new client_1.Prisma.Decimal(data.targetAmount),
                currentAmount: new client_1.Prisma.Decimal(data.currentAmount ?? 0),
                deadline: data.deadline,
            },
        });
    }
    async listByUser(userId) {
        return prisma_1.prisma.goal.findMany({
            where: { userId },
            include: {
                movements: {
                    orderBy: { createdAt: "desc" },
                    take: 3,
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async findById(userId, goalId) {
        return prisma_1.prisma.goal.findFirst({ where: { id: goalId, userId } });
    }
    async update(userId, goalId, data) {
        const exists = await this.findById(userId, goalId);
        if (!exists) {
            return null;
        }
        return prisma_1.prisma.goal.update({
            where: { id: goalId },
            data: {
                title: data.title,
                description: data.description,
                targetAmount: data.targetAmount !== undefined ? new client_1.Prisma.Decimal(data.targetAmount) : undefined,
                currentAmount: data.currentAmount !== undefined ? new client_1.Prisma.Decimal(data.currentAmount) : undefined,
                deadline: data.deadline,
                status: data.status,
            },
        });
    }
    async delete(userId, goalId) {
        const exists = await this.findById(userId, goalId);
        if (!exists) {
            return false;
        }
        await prisma_1.prisma.goal.delete({ where: { id: goalId } });
        return true;
    }
    async listMovements(userId, goalId, limit = 20) {
        return prisma_1.prisma.goalMovement.findMany({
            where: { userId, goalId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
}
exports.GoalRepository = GoalRepository;
