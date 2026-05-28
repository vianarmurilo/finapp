import { TransactionType } from "@prisma/client";
import { z } from "zod";
import { CategoryRepository } from "../repositories/category.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { EnvelopeService } from "./envelope/envelopeService";
import { AppError } from "../utils/app-error";

const baseTransactionSchema = z.object({
  categoryId: z.uuid(),
  familyGroupId: z.uuid().optional(),
  type: z.enum(TransactionType),
  amount: z.number().positive(),
  description: z.string().min(2).max(255),
  occurredAt: z.coerce.date(),
  paymentMethod: z.string().max(60).optional(),
  isRecurring: z.boolean().optional(),
  merchant: z.string().max(120).optional(),
  tags: z.array(z.string().max(30)).max(12).optional(),
});

const createTransactionSchema = baseTransactionSchema;

const updateTransactionSchema = baseTransactionSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Informe ao menos um campo para atualizar",
);

const transactionFiltersSchema = z.object({
  categoryId: z.uuid().optional(),
  type: z.enum(TransactionType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly envelopeService?: EnvelopeService,
  ) {}

  async create(userId: string, rawInput: unknown) {
    const input = createTransactionSchema.parse(rawInput);
    await this.validateCategoryOwnership(userId, input.categoryId);

    const created = await this.transactionRepository.create({
      userId,
      ...input,
    });

    await this.recalculateEnvelopeForDate(userId, input.occurredAt);

    return created;
  }

  async list(userId: string, rawFilters: unknown) {
    const filters = transactionFiltersSchema.parse(rawFilters);

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new AppError("Intervalo de datas invalido", 400);
    }

    return this.transactionRepository.list({
      userId,
      ...filters,
    });
  }

  async getById(userId: string, transactionId: string) {
    const transaction = await this.transactionRepository.findById(transactionId, userId);
    if (!transaction) {
      throw new AppError("Transacao nao encontrada", 404);
    }

    return transaction;
  }

  async update(userId: string, transactionId: string, rawInput: unknown) {
    const input = updateTransactionSchema.parse(rawInput);
    const previous = await this.transactionRepository.findById(transactionId, userId);

    if (!previous) {
      throw new AppError("Transacao nao encontrada", 404);
    }

    if (input.categoryId) {
      await this.validateCategoryOwnership(userId, input.categoryId);
    }

    const updated = await this.transactionRepository.update(transactionId, userId, input);

    if (!updated) {
      throw new AppError("Transacao nao encontrada", 404);
    }

    await Promise.all([
      this.recalculateEnvelopeForDate(userId, previous.occurredAt),
      this.recalculateEnvelopeForDate(userId, updated.occurredAt),
    ]);

    return updated;
  }

  async delete(userId: string, transactionId: string) {
    const existing = await this.transactionRepository.findById(transactionId, userId);
    const deleted = await this.transactionRepository.delete(transactionId, userId);

    if (!deleted) {
      throw new AppError("Transacao nao encontrada", 404);
    }

    if (existing) {
      await this.recalculateEnvelopeForDate(userId, existing.occurredAt);
    }
  }

  private async validateCategoryOwnership(userId: string, categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new AppError("Categoria nao encontrada", 404);
    }

    const isGlobalCategory = category.userId === null;
    const isOwnedCategory = category.userId === userId;

    if (!isGlobalCategory && !isOwnedCategory) {
      throw new AppError("Categoria invalida para este usuario", 403);
    }
  }

  private async recalculateEnvelopeForDate(userId: string, occurredAt: Date) {
    if (!this.envelopeService) {
      return;
    }

    await this.envelopeService.syncMonth(userId, occurredAt.getMonth() + 1, occurredAt.getFullYear());
  }
}
