import { Router } from "express";
import { IntelligenceController } from "../controllers/intelligence.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { AlertService } from "../services/alert.service";
import { AnalyticsService } from "../services/analytics.service";
import { AdvisorService } from "../services/advisor.service";
import { FinancialProfileService } from "../services/financial-profile.service";
import { GamificationService } from "../services/gamification.service";
import { PredictionService } from "../services/prediction.service";
import { SimulationService } from "../services/simulation.service";

const analyticsService = new AnalyticsService();
const predictionService = new PredictionService();
const alertService = new AlertService(predictionService);
const financialProfileService = new FinancialProfileService();
const gamificationService = new GamificationService();
const simulationService = new SimulationService(predictionService);
const advisorService = new AdvisorService(predictionService, financialProfileService);

const intelligenceController = new IntelligenceController(
  analyticsService,
  predictionService,
  alertService,
  financialProfileService,
  gamificationService,
  simulationService,
  advisorService,
);

export const intelligenceRouter = Router();

intelligenceRouter.use(authMiddleware);
intelligenceRouter.get("/analytics/overview", intelligenceController.analyticsOverview);
intelligenceRouter.get("/prediction", intelligenceController.prediction);
intelligenceRouter.get("/alerts", intelligenceController.alerts);
intelligenceRouter.get("/profile", intelligenceController.profile);
intelligenceRouter.get("/gamification", intelligenceController.gamification);
intelligenceRouter.get("/simulation", intelligenceController.simulation);
intelligenceRouter.get("/advisor", intelligenceController.advisor);
