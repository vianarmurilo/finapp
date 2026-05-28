import { Router, Request, Response } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { GamificationService } from "../services/gamification/gamificationService";

const gamificationService = new GamificationService();

export const gamificationRouter = Router();

gamificationRouter.use(authMiddleware);

gamificationRouter.get("/streak", async (req: Request, res: Response) => {
  const streak = await gamificationService.calculateDailyStreak(req.user!.userId);
  const score = await gamificationService.getFinancialHealthScore(req.user!.userId);
  res.status(200).json({ streak, score: score.score, justification: score.justification });
});

gamificationRouter.get("/badges", async (req: Request, res: Response) => {
  await gamificationService.checkAndAwardBadges(req.user!.userId);
  const badges = await gamificationService.getBadges(req.user!.userId);
  res.status(200).json({ badges });
});

gamificationRouter.get("/score", async (req: Request, res: Response) => {
  const score = await gamificationService.getFinancialHealthScore(req.user!.userId);
  res.status(200).json(score);
});
