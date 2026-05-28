"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalService = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma_1 = require("../config/prisma");
const app_error_1 = require("../utils/app-error");
const createGoalSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(140),
    description: zod_1.z.string().max(400).optional(),
    targetAmount: zod_1.z.number().positive(),
    currentAmount: zod_1.z.number().min(0).optional(),
    deadline: zod_1.z.coerce.date().optional(),
});
const updateGoalSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(2).max(140).optional(),
    description: zod_1.z.string().max(400).optional(),
    targetAmount: zod_1.z.number().positive().optional(),
    currentAmount: zod_1.z.number().min(0).optional(),
    deadline: zod_1.z.coerce.date().optional(),
    status: zod_1.z.nativeEnum(client_1.GoalStatus).optional(),
})
    .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo");
const adjustGoalBalanceSchema = zod_1.z.object({
    action: zod_1.z.enum(["deposit", "withdraw"]),
    amount: zod_1.z.number().positive(),
});
class GoalService {
    constructor(goalRepository) {
        this.goalRepository = goalRepository;
    }
    async getAvailableBalance(userId) {
        const [incomeAgg, expenseAgg, reservedAgg] = await Promise.all([
            prisma_1.prisma.transaction.aggregate({
                where: { userId, type: "INCOME" },
                _sum: { amount: true },
            }),
            prisma_1.prisma.transaction.aggregate({
                where: { userId, type: "EXPENSE" },
                _sum: { amount: true },
            }),
            prisma_1.prisma.goal.aggregate({
                where: {
                    userId,
                    status: { in: ["ACTIVE", "ACHIEVED", "PAUSED"] },
                },
                _sum: { currentAmount: true },
            }),
        ]);
        const incomes = new client_1.Prisma.Decimal(incomeAgg._sum.amount ?? 0);
        const expenses = new client_1.Prisma.Decimal(expenseAgg._sum.amount ?? 0);
        const reserved = new client_1.Prisma.Decimal(reservedAgg._sum.currentAmount ?? 0);
        return Number(incomes.minus(expenses).minus(reserved));
    }
    async create(userId, rawInput) {
        const input = createGoalSchema.parse(rawInput);
        return this.goalRepository.create({ userId, ...input });
    }
    async list(userId) {
        const goals = await this.goalRepository.listByUser(userId);
        return goals.map((goal) => ({
            ...goal,
            currentAmount: Number(goal.currentAmount),
            targetAmount: Number(goal.targetAmount),
            remainingAmount: Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount)),
            progress: Number(goal.currentAmount) / Number(goal.targetAmount),
            completionPercent: Math.min(100, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100),
            recentMovements: (goal.movements ?? []).map((movement) => ({
                id: movement.id,
                type: movement.type,
                amount: Number(movement.amount),
                note: movement.note,
                createdAt: movement.createdAt,
            })),
        }));
    }
    async update(userId, goalId, rawInput) {
        const input = updateGoalSchema.parse(rawInput);
        if (input.targetAmount !== undefined && input.currentAmount !== undefined && input.currentAmount > input.targetAmount) {
            input.status = "ACHIEVED";
        }
        const updated = await this.goalRepository.update(userId, goalId, input);
        if (!updated) {
            throw new app_error_1.AppError("Meta nao encontrada", 404);
        }
        return updated;
    }
    async delete(userId, goalId) {
        const removed = await this.goalRepository.delete(userId, goalId);
        if (!removed) {
            throw new app_error_1.AppError("Meta nao encontrada", 404);
        }
    }
    async adjustBalance(userId, goalId, rawInput) {
        const input = adjustGoalBalanceSchema.parse(rawInput);
        const goal = await this.goalRepository.findById(userId, goalId);
        if (!goal) {
            throw new app_error_1.AppError("Meta nao encontrada", 404);
        }
        const currentAmount = Number(goal.currentAmount);
        const targetAmount = Number(goal.targetAmount);
        if (input.action === "deposit") {
            const availableBalance = await this.getAvailableBalance(userId);
            if (input.amount > availableBalance) {
                throw new app_error_1.AppError("Saldo insuficiente para guardar esse valor na meta", 400);
            }
        }
        if (input.action === "withdraw" && input.amount > currentAmount) {
            throw new app_error_1.AppError("O valor para retirada excede o saldo reservado", 400);
        }
        const nextAmount = input.action === "deposit"
            ? Math.min(targetAmount, currentAmount + input.amount)
            : Math.max(0, currentAmount - input.amount);
        const status = nextAmount >= targetAmount ? "ACHIEVED" : "ACTIVE";
        const movementType = input.action === "deposit" ? client_1.GoalMovementType.DEPOSIT : client_1.GoalMovementType.WITHDRAW;
        const note = input.action === "deposit"
            ? "Depósito no cofrinho"
            : "Retirada do cofrinho";
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const result = await tx.goal.update({
                where: { id: goalId },
                data: {
                    currentAmount: new client_1.Prisma.Decimal(nextAmount),
                    status,
                },
            });
            await tx.goalMovement.create({
                data: {
                    goalId,
                    userId,
                    type: movementType,
                    amount: new client_1.Prisma.Decimal(input.amount),
                    note,
                },
            });
            return result;
        });
        return updated;
    }
    async history(userId, goalId, limit = 20) {
        const goal = await this.goalRepository.findById(userId, goalId);
        if (!goal) {
            throw new app_error_1.AppError("Meta nao encontrada", 404);
        }
        const movements = await this.goalRepository.listMovements(userId, goalId, limit);
        return movements.map((movement) => ({
            id: movement.id,
            type: movement.type,
            amount: Number(movement.amount),
            note: movement.note,
            createdAt: movement.createdAt,
        }));
    }
}
exports.GoalService = GoalService;
