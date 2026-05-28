"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("@prisma/client");
const zod_1 = require("zod");
const app_error_1 = require("../utils/app-error");
const listCategoryQuerySchema = zod_1.z.object({
    type: zod_1.z.enum(client_1.TransactionType).optional(),
});
const createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    type: zod_1.z.enum(client_1.TransactionType),
    icon: zod_1.z.string().max(80).optional(),
    color: zod_1.z.string().max(20).optional(),
    keywords: zod_1.z.array(zod_1.z.string().min(2).max(30)).max(20).optional(),
});
const categorySuggestionSchema = zod_1.z.object({
    description: zod_1.z.string().min(2).max(255),
});
const updateCategorySchema = zod_1.z
    .object({
    name: zod_1.z.string().min(2).max(120).optional(),
    icon: zod_1.z.string().max(80).optional(),
    color: zod_1.z.string().max(20).optional(),
    keywords: zod_1.z.array(zod_1.z.string().min(2).max(30)).max(20).optional(),
})
    .refine((value) => Object.keys(value).length > 0, "Informe ao menos um campo para atualizar");
function normalizeTokens(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3);
}
class CategoryService {
    constructor(categoryRepository) {
        this.categoryRepository = categoryRepository;
    }
    async list(userId, rawQuery) {
        const query = listCategoryQuerySchema.parse(rawQuery);
        return this.categoryRepository.listByUser(userId, query.type);
    }
    async create(userId, rawInput) {
        const input = createCategorySchema.parse(rawInput);
        return this.categoryRepository.create({ userId, ...input });
    }
    async suggest(userId, rawQuery) {
        const query = categorySuggestionSchema.parse(rawQuery);
        const tokens = normalizeTokens(query.description);
        const category = await this.categoryRepository.suggestCategory(userId, tokens);
        return {
            description: query.description,
            tokens,
            suggestion: category,
        };
    }
    async update(userId, categoryId, rawInput) {
        const input = updateCategorySchema.parse(rawInput);
        const category = await this.categoryRepository.findById(categoryId);
        if (!category) {
            throw new app_error_1.AppError("Categoria nao encontrada", 404);
        }
        if (category.userId !== userId) {
            throw new app_error_1.AppError("Nao e permitido editar categorias globais ou de outros usuarios", 403);
        }
        return this.categoryRepository.update(categoryId, userId, input);
    }
    async delete(userId, categoryId) {
        const category = await this.categoryRepository.findById(categoryId);
        if (!category) {
            throw new app_error_1.AppError("Categoria nao encontrada", 404);
        }
        if (category.userId !== userId) {
            throw new app_error_1.AppError("Nao e permitido excluir categorias globais ou de outros usuarios", 403);
        }
        try {
            await this.categoryRepository.delete(categoryId, userId);
        }
        catch (error) {
            if (error instanceof client_2.Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
                throw new app_error_1.AppError("Categoria vinculada a transacoes e nao pode ser excluida", 409);
            }
            throw error;
        }
    }
}
exports.CategoryService = CategoryService;
