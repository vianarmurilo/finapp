import { Request, Response } from "express";
import { AlertService } from "../services/alert.service";
import { AnalyticsService } from "../services/analytics.service";
import { AdvisorService } from "../services/advisor.service";
import { FinancialProfileService } from "../services/financial-profile.service";
import { GamificationService } from "../services/gamification.service";
import { PredictionService } from "../services/prediction.service";
import { SimulationService } from "../services/simulation.service";

export class IntelligenceController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly predictionService: PredictionService,
    private readonly alertService: AlertService,
    private readonly financialProfileService: FinancialProfileService,
    private readonly gamificationService: GamificationService,
    private readonly simulationService: SimulationService,
    private readonly advisorService: AdvisorService,
  ) {}

  analyticsOverview = async (req: Request, res: Response): Promise<void> => {
    const data = await this.analyticsService.overview(req.user!.userId, req.query);
    res.status(200).json(data);
  };

  prediction = async (req: Request, res: Response): Promise<void> => {
    const data = await this.predictionService.predict(req.user!.userId, req.query);
    res.status(200).json(data);
  };

  alerts = async (req: Request, res: Response): Promise<void> => {
    const data = await this.alertService.generate(req.user!.userId, req.query);
    res.status(200).json(data);
  };

  profile = async (req: Request, res: Response): Promise<void> => {
    const data = await this.financialProfileService.analyze(req.user!.userId);
    res.status(200).json(data);
  };

  gamification = async (req: Request, res: Response): Promise<void> => {
    const data = await this.gamificationService.summary(req.user!.userId);
    res.status(200).json(data);
  };

  simulation = async (req: Request, res: Response): Promise<void> => {
    const data = await this.simulationService.run(req.user!.userId, req.query);
    res.status(200).json(data);
  };

  advisor = async (req: Request, res: Response): Promise<void> => {
    const data = await this.advisorService.advise(req.user!.userId, req.query);
    res.status(200).json(data);
  };
}
