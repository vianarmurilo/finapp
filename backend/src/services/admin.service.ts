import { UserRepository } from "../repositories/user.repository";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/app-error";

export class AdminService {
  constructor(private readonly userRepository: UserRepository) {}

  async getSummary() {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [
      totalUsers,
      totalAdmins,
      totalTransactions,
      totalGoals,
      totalFamilyGroups,
      totalSubscriptions,
      newUsersLast7Days,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.transaction.count(),
      prisma.goal.count(),
      prisma.familyGroup.count(),
      prisma.subscription.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
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

  async listUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    sortOrder: "asc" | "desc";
  }) {
    const result = await this.userRepository.listAll(input);

    return {
      items: result.items,
      total: result.total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / input.pageSize)),
    };
  }

  async updateUserRole(input: {
    actorUserId: string;
    userId: string;
    role: "USER" | "ADMIN";
  }) {
    if (input.actorUserId === input.userId) {
      throw new AppError("Nao e permitido alterar o proprio perfil administrativo", 400);
    }

    const target = await this.userRepository.findById(input.userId);
    if (!target) {
      throw new AppError("Usuario nao encontrado", 404);
    }

    return this.userRepository.updateRoleById(input.userId, input.role);
  }

  async setUserBlockedState(input: {
    actorUserId: string;
    userId: string;
    isBlocked: boolean;
  }) {
    if (input.actorUserId === input.userId && input.isBlocked) {
      throw new AppError("Nao e permitido bloquear o proprio usuario", 400);
    }

    const target = await this.userRepository.findById(input.userId);
    if (!target) {
      throw new AppError("Usuario nao encontrado", 404);
    }

    return this.userRepository.setBlockedStateById(input.userId, input.isBlocked);
  }

  async deleteUser(input: { actorUserId: string; userId: string }) {
    if (input.actorUserId === input.userId) {
      throw new AppError("Nao e permitido remover o proprio usuario", 400);
    }

    const target = await this.userRepository.findById(input.userId);
    if (!target) {
      throw new AppError("Usuario nao encontrado", 404);
    }

    await this.userRepository.deleteById(input.userId);
  }

  async exportUsersCsv(search?: string) {
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

  private escapeCsvValue(value: string): string {
    const escaped = value.replaceAll('"', '""');
    return `"${escaped}"`;
  }
}