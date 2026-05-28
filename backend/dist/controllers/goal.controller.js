"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalController = void 0;
class GoalController {
    constructor(goalService) {
        this.goalService = goalService;
        this.create = async (req, res) => {
            const goal = await this.goalService.create(req.user.userId, req.body);
            res.status(201).json(goal);
        };
        this.list = async (req, res) => {
            const goals = await this.goalService.list(req.user.userId);
            res.status(200).json(goals);
        };
        this.update = async (req, res) => {
            const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const goal = await this.goalService.update(req.user.userId, goalId, req.body);
            res.status(200).json(goal);
        };
        this.delete = async (req, res) => {
            const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await this.goalService.delete(req.user.userId, goalId);
            res.status(204).send();
        };
        this.history = async (req, res) => {
            const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const limitRaw = req.query.limit;
            const limit = typeof limitRaw === "string" ? Number(limitRaw) : 20;
            const data = await this.goalService.history(req.user.userId, goalId, Number.isFinite(limit) ? limit : 20);
            res.status(200).json(data);
        };
        this.adjustBalance = async (req, res) => {
            const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const goal = await this.goalService.adjustBalance(req.user.userId, goalId, req.body);
            res.status(200).json(goal);
        };
    }
}
exports.GoalController = GoalController;
