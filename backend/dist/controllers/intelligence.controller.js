"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligenceController = void 0;
class IntelligenceController {
    constructor(analyticsService, predictionService, alertService, financialProfileService, gamificationService, simulationService, advisorService) {
        this.analyticsService = analyticsService;
        this.predictionService = predictionService;
        this.alertService = alertService;
        this.financialProfileService = financialProfileService;
        this.gamificationService = gamificationService;
        this.simulationService = simulationService;
        this.advisorService = advisorService;
        this.analyticsOverview = async (req, res) => {
            const data = await this.analyticsService.overview(req.user.userId, req.query);
            res.status(200).json(data);
        };
        this.prediction = async (req, res) => {
            const data = await this.predictionService.predict(req.user.userId, req.query);
            res.status(200).json(data);
        };
        this.alerts = async (req, res) => {
            const data = await this.alertService.generate(req.user.userId, req.query);
            res.status(200).json(data);
        };
        this.profile = async (req, res) => {
            const data = await this.financialProfileService.analyze(req.user.userId);
            res.status(200).json(data);
        };
        this.gamification = async (req, res) => {
            const data = await this.gamificationService.summary(req.user.userId);
            res.status(200).json(data);
        };
        this.simulation = async (req, res) => {
            const data = await this.simulationService.run(req.user.userId, req.query);
            res.status(200).json(data);
        };
        this.advisor = async (req, res) => {
            const data = await this.advisorService.advise(req.user.userId, req.query);
            res.status(200).json(data);
        };
    }
}
exports.IntelligenceController = IntelligenceController;
