"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryExtendedRepository = void 0;
const prisma_1 = require("../config/prisma");
class CategoryExtendedRepository {
    async listByUser(userId, type) {
        return prisma_1.prisma.category.findMany({
            where: {
                OR: [{ userId }, { userId: null }],
                type,
            },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        });
    }
    async create(input) {
        return prisma_1.prisma.category.create({
            data: {
                userId: input.userId,
                name: input.name,
                type: input.type,
                icon: input.icon,
                color: input.color,
                keywords: input.keywords ?? [],
                isDefault: false,
            },
        });
    }
    async findById(categoryId) {
        return prisma_1.prisma.category.findUnique({
            where: { id: categoryId },
        });
    }
    async update(categoryId, userId, input) {
        return prisma_1.prisma.category.update({
            where: {
                id: categoryId,
                userId,
            },
            data: {
                name: input.name,
                icon: input.icon,
                color: input.color,
                keywords: input.keywords,
            },
        });
    }
    async delete(categoryId, userId) {
        return prisma_1.prisma.category.delete({
            where: {
                id: categoryId,
                userId,
            },
        });
    }
    async suggestCategory(userId, normalizedTokens) {
        if (!normalizedTokens.length) {
            return null;
        }
        return prisma_1.prisma.category.findFirst({
            where: {
                OR: [{ userId }, { userId: null }],
                keywords: { hasSome: normalizedTokens },
            },
            orderBy: [{ userId: "desc" }],
        });
    }
}
exports.CategoryExtendedRepository = CategoryExtendedRepository;
