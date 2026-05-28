import { GoalMovementType, GoalStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { GoalRepository } from "../repositories/goal.repository";
import { AppError } from "../utils/app-error";

const createGoalSchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(400).optional(),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.coerce.date().optional(),
});

const updateGoalSchema = z
  .object({
    title: z.string().min(2).max(140).optional(),
    description: z.string().max(400).optional(),
    targetAmount: z.number().positive().optional(),
    currentAmount: z.number().min(0).optional(),
    deadline: z.coerce.date().optional(),
    status: z.nativeEnum(GoalStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Informe ao menos um campo");

const adjustGoalBalanceSchema = z.object({
  action: z.enum(["deposit", "withdraw"]),
  amount: z.number().positive(),
});

export class GoalService {
  constructor(private readonly goalRepository: GoalRepository) {}

  private async getAvailableBalance(userId: string): Promise<number> {
    const [incomeAgg, expenseAgg, reservedAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      prisma.goal.aggregate({
        where: {
          userId,
          status: { in: ["ACTIVE", "ACHIEVED", "PAUSED"] },
        },
        _sum: { currentAmount: true },
      }),
    ]);

    const incomes = new Prisma.Decimal(incomeAgg._sum.amount ?? 0);
    const expenses = new Prisma.Decimal(expenseAgg._sum.amount ?? 0);
    const reserved = new Prisma.Decimal(reservedAgg._sum.currentAmount ?? 0);

    return Number(incomes.minus(expenses).minus(reserved));
  }

  async create(userId: string, rawInput: unknown) {
    const input = createGoalSchema.parse(rawInput);
    return this.goalRepository.create({ userId, ...input });
  }

  async list(userId: string) {
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

  async update(userId: string, goalId: string, rawInput: unknown) {
    const input = updateGoalSchema.parse(rawInput);

    if (input.targetAmount !== undefined && input.currentAmount !== undefined && input.currentAmount > input.targetAmount) {
      input.status = "ACHIEVED";
    }

    const updated = await this.goalRepository.update(userId, goalId, input);
    if (!updated) {
      throw new AppError("Meta nao encontrada", 404);
    }

    return updated;
  }

  async delete(userId: string, goalId: string) {
    const removed = await this.goalRepository.delete(userId, goalId);
    if (!removed) {
      throw new AppError("Meta nao encontrada", 404);
    }
  }

  async adjustBalance(userId: string, goalId: string, rawInput: unknown) {
    const input = adjustGoalBalanceSchema.parse(rawInput);
    const goal = await this.goalRepository.findById(userId, goalId);

    if (!goal) {
      throw new AppError("Meta nao encontrada", 404);
    }

    const currentAmount = Number(goal.currentAmount);
    const targetAmount = Number(goal.targetAmount);

    if (input.action === "deposit") {
      const availableBalance = await this.getAvailableBalance(userId);
      if (input.amount > availableBalance) {
        throw new AppError("Saldo insuficiente para guardar esse valor na meta", 400);
      }
    }

    if (input.action === "withdraw" && input.amount > currentAmount) {
      throw new AppError("O valor para retirada excede o saldo reservado", 400);
    }

    const nextAmount =
      input.action === "deposit"
        ? Math.min(targetAmount, currentAmount + input.amount)
        : Math.max(0, currentAmount - input.amount);

    const status = nextAmount >= targetAmount ? "ACHIEVED" : "ACTIVE";

    const movementType = input.action === "deposit" ? GoalMovementType.DEPOSIT : GoalMovementType.WITHDRAW;
    const note =
      input.action === "deposit"
        ? "Depósito no cofrinho"
        : "Retirada do cofrinho";

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: new Prisma.Decimal(nextAmount),
          status,
        },
      });

      await tx.goalMovement.create({
        data: {
          goalId,
          userId,
          type: movementType,
          amount: new Prisma.Decimal(input.amount),
          note,
        },
      });

      return result;
    });

    return updated;
  }

  async history(userId: string, goalId: string, limit = 20) {
    const goal = await this.goalRepository.findById(userId, goalId);

    if (!goal) {
      throw new AppError("Meta nao encontrada", 404);
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
