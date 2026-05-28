"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const prisma_1 = require("../config/prisma");
class UserRepository {
    async findByEmail(email) {
        return prisma_1.prisma.user.findUnique({ where: { email } });
    }
    async findById(id) {
        return prisma_1.prisma.user.findUnique({ where: { id } });
    }
    async findAuthById(id) {
        return prisma_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                role: true,
                isBlocked: true,
            },
        });
    }
    async create(input) {
        return prisma_1.prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                passwordHash: input.passwordHash,
                role: input.role,
            },
        });
    }
    async updateAuthById(id, input) {
        return prisma_1.prisma.user.update({
            where: { id },
            data: {
                passwordHash: input.passwordHash,
                role: input.role,
            },
        });
    }
    async listAll(options) {
        const where = options.search
            ? {
                OR: [
                    { name: { contains: options.search, mode: "insensitive" } },
                    { email: { contains: options.search, mode: "insensitive" } },
                ],
            }
            : undefined;
        const [items, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where,
                orderBy: { createdAt: options.sortOrder },
                skip: (options.page - 1) * options.pageSize,
                take: options.pageSize,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isBlocked: true,
                    blockedAt: true,
                    currency: true,
                    createdAt: true,
                },
            }),
            prisma_1.prisma.user.count({ where }),
        ]);
        return { items, total };
    }
    async updateRoleById(id, role) {
        return prisma_1.prisma.user.update({
            where: { id },
            data: { role },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isBlocked: true,
                blockedAt: true,
                currency: true,
                createdAt: true,
            },
        });
    }
    async setBlockedStateById(id, isBlocked) {
        return prisma_1.prisma.user.update({
            where: { id },
            data: {
                isBlocked,
                blockedAt: isBlocked ? new Date() : null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isBlocked: true,
                blockedAt: true,
                currency: true,
                createdAt: true,
            },
        });
    }
    async deleteById(id) {
        return prisma_1.prisma.user.delete({ where: { id } });
    }
    async listAllForExport(search) {
        const where = search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            }
            : undefined;
        return prisma_1.prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isBlocked: true,
                blockedAt: true,
                currency: true,
                createdAt: true,
            },
        });
    }
}
exports.UserRepository = UserRepository;
