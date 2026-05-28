"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const app_error_1 = require("../utils/app-error");
const baseTransactionSchema = zod_1.z.object({
    categoryId: zod_1.z.uuid(),
    familyGroupId: zod_1.z.uuid().optional(),
    type: zod_1.z.enum(client_1.TransactionType),
    amount: zod_1.z.number().positive(),
    description: zod_1.z.string().min(2).max(255),
    occurredAt: zod_1.z.coerce.date(),
    paymentMethod: zod_1.z.string().max(60).optional(),
    isRecurring: zod_1.z.boolean().optional(),
    merchant: zod_1.z.string().max(120).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(30)).max(12).optional(),
});
const createTransactionSchema = baseTransactionSchema;
const updateTransactionSchema = baseTransactionSchema.partial().refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo para atualizar");
const transactionFiltersSchema = zod_1.z.object({
    categoryId: zod_1.z.uuid().optional(),
    type: zod_1.z.enum(client_1.TransactionType).optional(),
    startDate: zod_1.z.coerce.date().optional(),
    endDate: zod_1.z.coerce.date().optional(),
});
class TransactionService {
    constructor(transactionRepository, categoryRepository, envelopeService) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.envelopeService = envelopeService;
    }
    async create(userId, rawInput) {
        const input = createTransactionSchema.parse(rawInput);
        await this.validateCategoryOwnership(userId, input.categoryId);
        const created = await this.transactionRepository.create({
            userId,
            ...input,
        });
        await this.recalculateEnvelopeForDate(userId, input.occurredAt);
        return created;
    }
    async list(userId, rawFilters) {
        const filters = transactionFiltersSchema.parse(rawFilters);
        if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
            throw new app_error_1.AppError("Intervalo de datas invalido", 400);
        }
        return this.transactionRepository.list({
            userId,
            ...filters,
        });
    }
    async getById(userId, transactionId) {
        const transaction = await this.transactionRepository.findById(transactionId, userId);
        if (!transaction) {
            throw new app_error_1.AppError("Transacao nao encontrada", 404);
        }
        return transaction;
    }
    async update(userId, transactionId, rawInput) {
        const input = updateTransactionSchema.parse(rawInput);
        const previous = await this.transactionRepository.findById(transactionId, userId);
        if (!previous) {
            throw new app_error_1.AppError("Transacao nao encontrada", 404);
        }
        if (input.categoryId) {
            await this.validateCategoryOwnership(userId, input.categoryId);
        }
        const updated = await this.transactionRepository.update(transactionId, userId, input);
        if (!updated) {
            throw new app_error_1.AppError("Transacao nao encontrada", 404);
        }
        await Promise.all([
            this.recalculateEnvelopeForDate(userId, previous.occurredAt),
            this.recalculateEnvelopeForDate(userId, updated.occurredAt),
        ]);
        return updated;
    }
    async delete(userId, transactionId) {
        const existing = await this.transactionRepository.findById(transactionId, userId);
        const deleted = await this.transactionRepository.delete(transactionId, userId);
        if (!deleted) {
            throw new app_error_1.AppError("Transacao nao encontrada", 404);
        }
        if (existing) {
            await this.recalculateEnvelopeForDate(userId, existing.occurredAt);
        }
    }
    async validateCategoryOwnership(userId, categoryId) {
        const category = await this.categoryRepository.findById(categoryId);
        if (!category) {
            throw new app_error_1.AppError("Categoria nao encontrada", 404);
        }
        const isGlobalCategory = category.userId === null;
        const isOwnedCategory = category.userId === userId;
        if (!isGlobalCategory && !isOwnedCategory) {
            throw new app_error_1.AppError("Categoria invalida para este usuario", 403);
        }
    }
    async recalculateEnvelopeForDate(userId, occurredAt) {
        if (!this.envelopeService) {
            return;
        }
        await this.envelopeService.syncMonth(userId, occurredAt.getMonth() + 1, occurredAt.getFullYear());
    }
}
exports.TransactionService = TransactionService;
