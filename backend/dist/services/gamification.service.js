"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const prisma_1 = require("../config/prisma");
const ACHIEVEMENTS = [
    { key: "first_transaction", title: "Primeiro Passo", points: 20 },
    { key: "fifty_transactions", title: "Controle Consistente", points: 80 },
    { key: "first_goal", title: "Primeira Meta", points: 50 },
    { key: "goal_achiever", title: "Meta Batida", points: 120 },
];
class GamificationService {
    async summary(userId) {
        const [transactionsCount, goals] = await Promise.all([
            prisma_1.prisma.transaction.count({ where: { userId } }),
            prisma_1.prisma.goal.findMany({ where: { userId } }),
        ]);
        const achievedGoals = goals.filter((goal) => goal.status === "ACHIEVED").length;
        let points = 0;
        points += transactionsCount * 5;
        points += goals.length * 15;
        points += achievedGoals * 100;
        const unlocked = ACHIEVEMENTS.filter((achievement) => {
            if (achievement.key === "first_transaction")
                return transactionsCount >= 1;
            if (achievement.key === "fifty_transactions")
                return transactionsCount >= 50;
            if (achievement.key === "first_goal")
                return goals.length >= 1;
            if (achievement.key === "goal_achiever")
                return achievedGoals >= 1;
            return false;
        });
        const pointsFromAchievements = unlocked.reduce((acc, ach) => acc + ach.points, 0);
        points += pointsFromAchievements;
        const level = Math.floor(points / 250) + 1;
        const nextLevelAt = level * 250;
        return {
            points,
            level,
            nextLevelAt,
            achievements: unlocked,
        };
    }
}
exports.GamificationService = GamificationService;
