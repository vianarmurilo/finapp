import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export class GoalRepository {
  async create(data: {
    userId: string;
    title: string;
    description?: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: Date;
  }) {
    return prisma.goal.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        targetAmount: new Prisma.Decimal(data.targetAmount),
        currentAmount: new Prisma.Decimal(data.currentAmount ?? 0),
        deadline: data.deadline,
      },
    });
  }

  async listByUser(userId: string) {
    return prisma.goal.findMany({
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

  async findById(userId: string, goalId: string) {
    return prisma.goal.findFirst({ where: { id: goalId, userId } });
  }

  async update(
    userId: string,
    goalId: string,
    data: {
      title?: string;
      description?: string;
      targetAmount?: number;
      currentAmount?: number;
      deadline?: Date;
      status?: "ACTIVE" | "ACHIEVED" | "PAUSED" | "CANCELLED";
    },
  ) {
    const exists = await this.findById(userId, goalId);
    if (!exists) {
      return null;
    }

    return prisma.goal.update({
      where: { id: goalId },
      data: {
        title: data.title,
        description: data.description,
        targetAmount: data.targetAmount !== undefined ? new Prisma.Decimal(data.targetAmount) : undefined,
        currentAmount: data.currentAmount !== undefined ? new Prisma.Decimal(data.currentAmount) : undefined,
        deadline: data.deadline,
        status: data.status,
      },
    });
  }

  async delete(userId: string, goalId: string) {
    const exists = await this.findById(userId, goalId);
    if (!exists) {
      return false;
    }

    await prisma.goal.delete({ where: { id: goalId } });
    return true;
  }

  async listMovements(userId: string, goalId: string, limit = 20) {
    return prisma.goalMovement.findMany({
      where: { userId, goalId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
