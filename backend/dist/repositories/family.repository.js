"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyRepository = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../config/prisma");
class FamilyRepository {
    async createGroup(ownerUserId, name, inviteCode) {
        return prisma_1.prisma.familyGroup.create({
            data: {
                ownerUserId,
                name,
                inviteCode,
                members: {
                    create: {
                        userId: ownerUserId,
                        role: client_1.FamilyRole.OWNER,
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
            },
        });
    }
    async findGroupByInviteCode(inviteCode) {
        return prisma_1.prisma.familyGroup.findUnique({
            where: { inviteCode },
            include: {
                members: true,
            },
        });
    }
    async addMember(groupId, userId, role = client_1.FamilyRole.MEMBER) {
        return prisma_1.prisma.familyMember.create({
            data: {
                familyGroupId: groupId,
                userId,
                role,
            },
        });
    }
    async listUserGroups(userId) {
        return prisma_1.prisma.familyGroup.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async familyDashboard(groupId) {
        const [transactions, totalExpenses, totalIncomes, memberRows, familyMembers] = await Promise.all([
            prisma_1.prisma.transaction.findMany({
                where: { familyGroupId: groupId },
                orderBy: { occurredAt: "desc" },
                take: 50,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.transaction.aggregate({
                where: { familyGroupId: groupId, type: "EXPENSE" },
                _sum: { amount: true },
            }),
            prisma_1.prisma.transaction.aggregate({
                where: { familyGroupId: groupId, type: "INCOME" },
                _sum: { amount: true },
            }),
            prisma_1.prisma.transaction.groupBy({
                by: ["userId", "type"],
                where: { familyGroupId: groupId },
                _sum: { amount: true },
            }),
            prisma_1.prisma.familyMember.findMany({
                where: { familyGroupId: groupId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
        ]);
        const balance = new client_1.Prisma.Decimal(totalIncomes._sum.amount ?? 0).minus(totalExpenses._sum.amount ?? 0);
        const memberStatsMap = new Map();
        for (const member of familyMembers) {
            memberStatsMap.set(member.userId, {
                userId: member.userId,
                name: member.user.name,
                incomes: new client_1.Prisma.Decimal(0),
                expenses: new client_1.Prisma.Decimal(0),
            });
        }
        for (const row of memberRows) {
            const stats = memberStatsMap.get(row.userId);
            if (!stats) {
                continue;
            }
            const value = row._sum.amount ?? new client_1.Prisma.Decimal(0);
            if (row.type === "INCOME") {
                stats.incomes = stats.incomes.plus(value);
            }
            else if (row.type === "EXPENSE") {
                stats.expenses = stats.expenses.plus(value);
            }
        }
        const memberStats = Array.from(memberStatsMap.values())
            .map((item) => ({
            userId: item.userId,
            name: item.name,
            incomes: item.incomes,
            expenses: item.expenses,
            balance: item.incomes.minus(item.expenses),
        }))
            .sort((a, b) => Number(b.balance.minus(a.balance)));
        return {
            totalExpenses: totalExpenses._sum.amount ?? new client_1.Prisma.Decimal(0),
            totalIncomes: totalIncomes._sum.amount ?? new client_1.Prisma.Decimal(0),
            balance,
            memberStats,
            lastTransactions: transactions,
        };
    }
}
exports.FamilyRepository = FamilyRepository;
