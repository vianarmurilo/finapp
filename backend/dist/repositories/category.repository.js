"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const prisma_1 = require("../config/prisma");
class CategoryRepository {
    async findById(categoryId) {
        return prisma_1.prisma.category.findUnique({ where: { id: categoryId } });
    }
    async listForUser(userId) {
        return prisma_1.prisma.category.findMany({
            where: {
                OR: [{ userId }, { userId: null }],
            },
            orderBy: { name: "asc" },
        });
    }
}
exports.CategoryRepository = CategoryRepository;
