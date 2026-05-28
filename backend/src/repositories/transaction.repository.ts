import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../config/prisma";

interface CreateTransactionInput {
  userId: string;
  categoryId: string;
  familyGroupId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  occurredAt: Date;
  paymentMethod?: string;
  isRecurring?: boolean;
  merchant?: string;
  tags?: string[];
}

interface UpdateTransactionInput {
  categoryId?: string;
  familyGroupId?: string;
  type?: TransactionType;
  amount?: number;
  description?: string;
  occurredAt?: Date;
  paymentMethod?: string;
  isRecurring?: boolean;
  merchant?: string;
  tags?: string[];
}

interface ListFilters {
  userId: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
}

export class TransactionRepository {
  async createMany(inputs: CreateTransactionInput[]) {
    // Use prisma.createMany when possible for speed; include returns not supported by createMany
    const prismaInputs = inputs.map((i) => ({
      userId: i.userId,
      categoryId: i.categoryId,
      familyGroupId: i.familyGroupId,
      type: i.type,
      amount: new Prisma.Decimal(i.amount),
      description: i.description,
      occurredAt: i.occurredAt,
      paymentMethod: i.paymentMethod,
      isRecurring: i.isRecurring ?? false,
      merchant: i.merchant,
      tags: i.tags ?? [],
    }));

    await prisma.transaction.createMany({ data: prismaInputs });
  }

  async existsDuplicate(userId: string, occurredAt: Date, amount: number, description: string) {
    const found = await prisma.transaction.findFirst({
      where: {
        userId,
        occurredAt,
        amount: new Prisma.Decimal(amount),
        description,
      },
      select: { id: true },
    });

    return !!found;
  }
  async create(input: CreateTransactionInput) {
    return prisma.transaction.create({
      data: {
        userId: input.userId,
        categoryId: input.categoryId,
        familyGroupId: input.familyGroupId,
        type: input.type,
        amount: new Prisma.Decimal(input.amount),
        description: input.description,
        occurredAt: input.occurredAt,
        paymentMethod: input.paymentMethod,
        isRecurring: input.isRecurring ?? false,
        merchant: input.merchant,
        tags: input.tags ?? [],
      },
      include: {
        category: true,
      },
    });
  }

  async findById(transactionId: string, userId: string) {
    return prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        category: true,
      },
    });
  }

  async list(filters: ListFilters) {
    return prisma.transaction.findMany({
      where: {
        userId: filters.userId,
        categoryId: filters.categoryId,
        type: filters.type,
        occurredAt: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        occurredAt: "desc",
      },
    });
  }

  async update(transactionId: string, userId: string, input: UpdateTransactionInput) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      select: { id: true },
    });

    if (!transaction) {
      return null;
    }

    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        categoryId: input.categoryId,
        familyGroupId: input.familyGroupId,
        type: input.type,
        amount: input.amount !== undefined ? new Prisma.Decimal(input.amount) : undefined,
        description: input.description,
        occurredAt: input.occurredAt,
        paymentMethod: input.paymentMethod,
        isRecurring: input.isRecurring,
        merchant: input.merchant,
        tags: input.tags,
      },
      include: {
        category: true,
      },
    });
  }

  async delete(transactionId: string, userId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      select: { id: true },
    });

    if (!transaction) {
      return false;
    }

    await prisma.transaction.delete({ where: { id: transactionId } });
    return true;
  }
}
