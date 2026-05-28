import { Envelope, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/app-error";

const envelopeSchema = z.object({
  categoryId: z.uuid().nullable().optional(),
  name: z.string().min(2).max(140),
  budgetAmount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  color: z.string().min(4).max(20),
  icon: z.string().min(1).max(80),
});

const updateEnvelopeSchema = envelopeSchema.partial().refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo");

export type EnvelopeAlert = {
  envelopeId: string;
  name: string;
  threshold: 80 | 100;
  spent: number;
  budget: number;
};

export type EnvelopeDto = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  budgetAmount: number;
  currentSpent: number;
  month: number;
  year: number;
  color: string;
  icon: string;
  createdAt: Date;
  progressPercent: number;
  remainingAmount: number;
  isOverBudget: boolean;
};

type EnvelopeWithCategory = Envelope & { category?: { id: string; name: string } | null };

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toNumber(value: Prisma.Decimal | null | undefined): number {
  return Number(value ?? 0);
}

function toMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function toDto(envelope: EnvelopeWithCategory): EnvelopeDto {
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

export class EnvelopeService {
  async createEnvelope(userId: string, rawInput: unknown) {
    const input = envelopeSchema.parse(rawInput);
    const created = await prisma.envelope.create({
      data: {
        userId,
        categoryId: input.categoryId ?? null,
        name: input.name,
        budgetAmount: new Prisma.Decimal(input.budgetAmount),
        currentSpent: new Prisma.Decimal(0),
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

  async updateEnvelope(userId: string, envelopeId: string, rawInput: unknown) {
    const existing = await this.getById(userId, envelopeId);
    if (!existing) {
      throw new AppError("Envelope nao encontrado", 404);
    }

    const input = updateEnvelopeSchema.parse(rawInput);
    const updated = await prisma.envelope.update({
      where: { id: envelopeId },
      data: {
        categoryId: input.categoryId === undefined ? undefined : input.categoryId,
        name: input.name,
        budgetAmount: input.budgetAmount !== undefined ? new Prisma.Decimal(input.budgetAmount) : undefined,
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

  async deleteEnvelope(userId: string, envelopeId: string) {
    const existing = await this.getById(userId, envelopeId);
    if (!existing) {
      throw new AppError("Envelope nao encontrado", 404);
    }

    await prisma.envelope.delete({ where: { id: envelopeId } });
    await this.syncMonth(userId, existing.month, existing.year);
  }

  async getEnvelopesForMonth(userId: string, month: number, year: number) {
    await this.syncMonth(userId, month, year);
    const envelopes = await prisma.envelope.findMany({
      where: { userId, month, year },
      include: { category: true },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    });

    return envelopes.map((envelope) => toDto(envelope));
  }

  async syncMonth(userId: string, month: number, year: number) {
    const { start, end } = toMonthRange(month, year);
    const [envelopes, transactions] = await Promise.all([
      prisma.envelope.findMany({
        where: { userId, month, year },
        include: { category: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          type: "EXPENSE",
          occurredAt: { gte: start, lte: end },
        },
        include: { category: true },
      }),
    ]);

    const alerts: EnvelopeAlert[] = [];

    for (const envelope of envelopes) {
      const previousSpent = toNumber(envelope.currentSpent);
      const budgetAmount = toNumber(envelope.budgetAmount);
      const spent = transactions.reduce((total, transaction) => {
        if (this.matchesEnvelope(envelope, transaction.categoryId, transaction.category?.name ?? null)) {
          return total + toNumber(transaction.amount);
        }

        return total;
      }, 0);

      await prisma.envelope.update({
        where: { id: envelope.id },
        data: { currentSpent: new Prisma.Decimal(spent) },
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

  async getById(userId: string, envelopeId: string) {
    return prisma.envelope.findFirst({
      where: { id: envelopeId, userId },
      include: { category: true },
    });
  }

  private async getByIdOrThrow(userId: string, envelopeId: string) {
    const envelope = await this.getById(userId, envelopeId);
    if (!envelope) {
      throw new AppError("Envelope nao encontrado", 404);
    }

    return toDto(envelope);
  }

  private matchesEnvelope(envelope: EnvelopeWithCategory, transactionCategoryId: string, transactionCategoryName: string | null) {
    if (envelope.categoryId && envelope.categoryId === transactionCategoryId) {
      return true;
    }

    if (!envelope.categoryId && transactionCategoryName) {
      return normalizeText(envelope.name) === normalizeText(transactionCategoryName);
    }

    return transactionCategoryName ? normalizeText(envelope.name) === normalizeText(transactionCategoryName) : false;
  }
}
