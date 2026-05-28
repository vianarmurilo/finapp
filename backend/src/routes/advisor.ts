import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { buildUserFinancialContext } from "../services/advisor/financialContext";
import { generateInsightsForUser } from "../services/advisor/insightGenerator";
import { authMiddleware } from "../middlewares/auth.middleware";

export const advisorRouter = Router();

advisorRouter.use(authMiddleware);

advisorRouter.get("/", async (req: Request, res: Response) => {
  try {
    const months = Number(req.query.months ?? 3);
    const ctx = await buildUserFinancialContext(req.user!.userId, months);
    const { insights, generatedAt, expiresAt } = await generateInsightsForUser(req.user!.userId, ctx, false);

    res.status(200).json({ insights, financialContext: ctx, generatedAt, cacheExpiresAt: expiresAt });
  } catch (err: unknown) {
    res.status(500).json({ message: (err as Error).message || "Erro ao gerar advisor" });
  }
});

advisorRouter.get("/refresh", async (req: Request, res: Response) => {
  try {
    const months = Number(req.query.months ?? 3);
    const ctx = await buildUserFinancialContext(req.user!.userId, months);
    const { insights, generatedAt, expiresAt } = await generateInsightsForUser(req.user!.userId, ctx, true);
    res.status(200).json({ insights, financialContext: ctx, generatedAt, cacheExpiresAt: expiresAt });
  } catch (err: unknown) {
    res.status(500).json({ message: (err as Error).message || "Erro ao forcar refresh do advisor" });
  }
});

advisorRouter.get("/history", async (req: Request, res: Response) => {
  try {
    const history = await prisma.advisorCache.findMany({
      where: { userId: req.user!.userId },
      orderBy: { generatedAt: "desc" },
      take: 10,
    });
    res.status(200).json({ history });
  } catch (err: unknown) {
    res.status(500).json({ message: (err as Error).message || "Erro ao buscar historico" });
  }
});
