"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gamificationRouter = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const gamificationService_1 = require("../services/gamification/gamificationService");
const gamificationService = new gamificationService_1.GamificationService();
exports.gamificationRouter = (0, express_1.Router)();
exports.gamificationRouter.use(auth_middleware_1.authMiddleware);
exports.gamificationRouter.get("/streak", async (req, res) => {
    const streak = await gamificationService.calculateDailyStreak(req.user.userId);
    const score = await gamificationService.getFinancialHealthScore(req.user.userId);
    res.status(200).json({ streak, score: score.score, justification: score.justification });
});
exports.gamificationRouter.get("/badges", async (req, res) => {
    await gamificationService.checkAndAwardBadges(req.user.userId);
    const badges = await gamificationService.getBadges(req.user.userId);
    res.status(200).json({ badges });
});
exports.gamificationRouter.get("/score", async (req, res) => {
    const score = await gamificationService.getFinancialHealthScore(req.user.userId);
    res.status(200).json(score);
});
