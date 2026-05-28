import { Prisma, SubscriptionFrequency } from "@prisma/client";
import { prisma } from "../config/prisma";

export class SubscriptionRepository {
  async create(data: {
    userId: string;
    categoryId?: string;
    name: string;
    amount: number;
    frequency: SubscriptionFrequency;
    nextChargeDate: Date;
    isActive?: boolean;
  }) {
    return prisma.subscription.create({
      data: {
        userId: data.userId,
        categoryId: data.categoryId,
        name: data.name,
        amount: new Prisma.Decimal(data.amount),
        frequency: data.frequency,
        nextChargeDate: data.nextChargeDate,
        isActive: data.isActive ?? true,
      },
      include: { category: true },
    });
  }

  async listByUser(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { nextChargeDate: "asc" },
    });
  }

  async findById(userId: string, subscriptionId: string) {
    return prisma.subscription.findFirst({ where: { id: subscriptionId, userId } });
  }

  async update(
    userId: string,
    subscriptionId: string,
    data: {
      categoryId?: string;
      name?: string;
      amount?: number;
      frequency?: SubscriptionFrequency;
      nextChargeDate?: Date;
      isActive?: boolean;
    },
  ) {
    const exists = await this.findById(userId, subscriptionId);
    if (!exists) {
      return null;
    }

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
        frequency: data.frequency,
        nextChargeDate: data.nextChargeDate,
        isActive: data.isActive,
      },
      include: { category: true },
    });
  }

  async delete(userId: string, subscriptionId: string) {
    const exists = await this.findById(userId, subscriptionId);
    if (!exists) {
      return false;
    }

    await prisma.subscription.delete({ where: { id: subscriptionId } });
    return true;
  }
}
