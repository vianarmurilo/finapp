import { FamilyRole, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export class FamilyRepository {
  async createGroup(ownerUserId: string, name: string, inviteCode: string) {
    return prisma.familyGroup.create({
      data: {
        ownerUserId,
        name,
        inviteCode,
        members: {
          create: {
            userId: ownerUserId,
            role: FamilyRole.OWNER,
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

  async findGroupByInviteCode(inviteCode: string) {
    return prisma.familyGroup.findUnique({
      where: { inviteCode },
      include: {
        members: true,
      },
    });
  }

  async addMember(groupId: string, userId: string, role: FamilyRole = FamilyRole.MEMBER) {
    return prisma.familyMember.create({
      data: {
        familyGroupId: groupId,
        userId,
        role,
      },
    });
  }

  async listUserGroups(userId: string) {
    return prisma.familyGroup.findMany({
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

  async familyDashboard(groupId: string) {
    const [transactions, totalExpenses, totalIncomes, memberRows, familyMembers] = await Promise.all([
      prisma.transaction.findMany({
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
      prisma.transaction.aggregate({
        where: { familyGroupId: groupId, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { familyGroupId: groupId, type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["userId", "type"],
        where: { familyGroupId: groupId },
        _sum: { amount: true },
      }),
      prisma.familyMember.findMany({
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

    const balance = new Prisma.Decimal(totalIncomes._sum.amount ?? 0).minus(totalExpenses._sum.amount ?? 0);

    const memberStatsMap = new Map<string, { userId: string; name: string; incomes: Prisma.Decimal; expenses: Prisma.Decimal }>();

    for (const member of familyMembers) {
      memberStatsMap.set(member.userId, {
        userId: member.userId,
        name: member.user.name,
        incomes: new Prisma.Decimal(0),
        expenses: new Prisma.Decimal(0),
      });
    }

    for (const row of memberRows) {
      const stats = memberStatsMap.get(row.userId);
      if (!stats) {
        continue;
      }

      const value = row._sum.amount ?? new Prisma.Decimal(0);
      if (row.type === "INCOME") {
        stats.incomes = stats.incomes.plus(value);
      } else if (row.type === "EXPENSE") {
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
      totalExpenses: totalExpenses._sum.amount ?? new Prisma.Decimal(0),
      totalIncomes: totalIncomes._sum.amount ?? new Prisma.Decimal(0),
      balance,
      memberStats,
      lastTransactions: transactions,
    };
  }
}
