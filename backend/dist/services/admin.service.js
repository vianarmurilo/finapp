"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const prisma_1 = require("../config/prisma");
const app_error_1 = require("../utils/app-error");
class AdminService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async getSummary() {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const [totalUsers, totalAdmins, totalTransactions, totalGoals, totalFamilyGroups, totalSubscriptions, newUsersLast7Days,] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.user.count({ where: { role: "ADMIN" } }),
            prisma_1.prisma.transaction.count(),
            prisma_1.prisma.goal.count(),
            prisma_1.prisma.familyGroup.count(),
            prisma_1.prisma.subscription.count(),
            prisma_1.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        ]);
        return {
            totalUsers,
            totalAdmins,
            totalRegularUsers: Math.max(0, totalUsers - totalAdmins),
            totalTransactions,
            totalGoals,
            totalFamilyGroups,
            totalSubscriptions,
            newUsersLast7Days,
            generatedAt: now.toISOString(),
        };
    }
    async listUsers(input) {
        const result = await this.userRepository.listAll(input);
        return {
            items: result.items,
            total: result.total,
            page: input.page,
            pageSize: input.pageSize,
            totalPages: Math.max(1, Math.ceil(result.total / input.pageSize)),
        };
    }
    async updateUserRole(input) {
        if (input.actorUserId === input.userId) {
            throw new app_error_1.AppError("Nao e permitido alterar o proprio perfil administrativo", 400);
        }
        const target = await this.userRepository.findById(input.userId);
        if (!target) {
            throw new app_error_1.AppError("Usuario nao encontrado", 404);
        }
        return this.userRepository.updateRoleById(input.userId, input.role);
    }
    async setUserBlockedState(input) {
        if (input.actorUserId === input.userId && input.isBlocked) {
            throw new app_error_1.AppError("Nao e permitido bloquear o proprio usuario", 400);
        }
        const target = await this.userRepository.findById(input.userId);
        if (!target) {
            throw new app_error_1.AppError("Usuario nao encontrado", 404);
        }
        return this.userRepository.setBlockedStateById(input.userId, input.isBlocked);
    }
    async deleteUser(input) {
        if (input.actorUserId === input.userId) {
            throw new app_error_1.AppError("Nao e permitido remover o proprio usuario", 400);
        }
        const target = await this.userRepository.findById(input.userId);
        if (!target) {
            throw new app_error_1.AppError("Usuario nao encontrado", 404);
        }
        await this.userRepository.deleteById(input.userId);
    }
    async exportUsersCsv(search) {
        const users = await this.userRepository.listAllForExport(search);
        const headers = [
            "id",
            "nome",
            "email",
            "perfil",
            "bloqueado",
            "bloqueado_em",
            "moeda",
            "criado_em",
        ];
        const rows = users.map((user) => [
            user.id,
            user.name,
            user.email,
            user.role,
            user.isBlocked ? "SIM" : "NAO",
            user.blockedAt ? user.blockedAt.toISOString() : "",
            user.currency,
            user.createdAt.toISOString(),
        ]);
        return [headers, ...rows]
            .map((row) => row.map(this.escapeCsvValue).join(","))
            .join("\n");
    }
    escapeCsvValue(value) {
        const escaped = value.replaceAll('"', '""');
        return `"${escaped}"`;
    }
}
exports.AdminService = AdminService;
