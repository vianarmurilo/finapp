"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advisorRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const financialContext_1 = require("../services/advisor/financialContext");
const insightGenerator_1 = require("../services/advisor/insightGenerator");
const auth_middleware_1 = require("../middlewares/auth.middleware");
exports.advisorRouter = (0, express_1.Router)();
exports.advisorRouter.use(auth_middleware_1.authMiddleware);
exports.advisorRouter.get("/", async (req, res) => {
    try {
        const months = Number(req.query.months ?? 3);
        const ctx = await (0, financialContext_1.buildUserFinancialContext)(req.user.userId, months);
        const { insights, generatedAt, expiresAt } = await (0, insightGenerator_1.generateInsightsForUser)(req.user.userId, ctx, false);
        res.status(200).json({ insights, financialContext: ctx, generatedAt, cacheExpiresAt: expiresAt });
    }
    catch (err) {
        res.status(500).json({ message: err.message || "Erro ao gerar advisor" });
    }
});
exports.advisorRouter.get("/refresh", async (req, res) => {
    try {
        const months = Number(req.query.months ?? 3);
        const ctx = await (0, financialContext_1.buildUserFinancialContext)(req.user.userId, months);
        const { insights, generatedAt, expiresAt } = await (0, insightGenerator_1.generateInsightsForUser)(req.user.userId, ctx, true);
        res.status(200).json({ insights, financialContext: ctx, generatedAt, cacheExpiresAt: expiresAt });
    }
    catch (err) {
        res.status(500).json({ message: err.message || "Erro ao forcar refresh do advisor" });
    }
});
exports.advisorRouter.get("/history", async (req, res) => {
    try {
        const history = await prisma_1.prisma.advisorCache.findMany({
            where: { userId: req.user.userId },
            orderBy: { generatedAt: "desc" },
            take: 10,
        });
        res.status(200).json({ history });
    }
    catch (err) {
        res.status(500).json({ message: err.message || "Erro ao buscar historico" });
    }
});
